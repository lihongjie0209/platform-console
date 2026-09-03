import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

export interface CrudMutationViolation {
  column: number;
  file: string;
  line: number;
}

function propertyName(node: ts.ObjectLiteralElementLike) {
  if (!('name' in node) || !node.name) return '';
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return '';
}

export function findCrudMutationViolations(source: string, file = 'component.vue'): CrudMutationViolation[] {
  const script = source.match(/<script\s+setup(?:\s+lang=["']ts["'])?\s*>([\s\S]*?)<\/script>/)?.[1];
  if (!script) return [];

  const parsed = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const violations: CrudMutationViolation[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.type &&
      ts.isTypeReferenceNode(node.type) &&
      ts.isIdentifier(node.type.typeName) &&
      node.type.typeName.text === 'BizCrudAdapter' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const names = new Set(node.initializer.properties.map(propertyName));
      if (names.has('update') && !names.has('detail')) {
        const position = parsed.getLineAndCharacterOfPosition(node.name.getStart(parsed));
        violations.push({
          file,
          line: position.line + 1,
          column: position.character + 1
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return violations;
}

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(absolute);
      return entry.name.endsWith('.vue') ? [absolute] : [];
    })
  );
  return nested.flat();
}

async function main() {
  const root = path.resolve('src/apps');
  const files = await sourceFiles(root);
  const violations = (
    await Promise.all(
      files.map(async file =>
        findCrudMutationViolations(await readFile(file, 'utf8'), path.relative(process.cwd(), file))
      )
    )
  ).flat();

  if (violations.length) {
    console.error('BizCrud update adapters must fetch authorized detail before editing:');
    for (const violation of violations) console.error(`- ${violation.file}:${violation.line}:${violation.column}`);
    process.exitCode = 1;
    return;
  }
  console.log('BizCrud update adapters use detail reads as optimistic-lock baselines.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) await main();
