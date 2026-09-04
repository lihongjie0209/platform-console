import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { globSync } from 'tinyglobby';
import ts from 'typescript';

const mutationActions = new Set([
  'add',
  'abort',
  'approve',
  'cancel',
  'change-password',
  'claim',
  'complete',
  'complete-upload',
  'confirm',
  'create',
  'create-attempt',
  'delegate',
  'delete',
  'disable-mfa',
  'enable-mfa',
  'finalize',
  'grant',
  'initiate',
  'issue',
  'issue-password-reset',
  'member-add',
  'member-remove',
  'publish',
  'put',
  'put-draft',
  'record',
  'register',
  'reject',
  'replay',
  'remove',
  'reset',
  'reset-mfa',
  'retry',
  'revoke',
  'rollback',
  'rotate',
  'rotate-secret',
  'send',
  'set',
  'start',
  'test',
  'trigger',
  'update',
  'update-profile',
  'update-status',
  'upsert',
  'void'
]);

function propertyName(node: ts.PropertyName) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return '';
}

function property(object: ts.ObjectLiteralExpression, name: string) {
  return object.properties.find(
    (candidate): candidate is ts.PropertyAssignment =>
      ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === name
  );
}

function hasObjectProperty(expression: ts.Expression, name: string) {
  return ts.isObjectLiteralExpression(expression) && Boolean(property(expression, name));
}

export function findMutationRequestsWithoutIdempotency(files: Array<{ path: string; source: string }>) {
  const violations: string[] = [];
  for (const file of files) {
    const sourceFile = ts.createSourceFile(file.path, file.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const urlProperty = property(node, 'url');
        if (urlProperty && ts.isStringLiteralLike(urlProperty.initializer)) {
          const url = urlProperty.initializer.text;
          const action = url.split('/').filter(Boolean).at(-1) || '';
          if (mutationActions.has(action)) {
            const headers = property(node, 'headers');
            const data = property(node, 'data');
            const hasHeader = Boolean(headers && hasObjectProperty(headers.initializer, 'Idempotency-Key'));
            const hasBodyKey = Boolean(data && hasObjectProperty(data.initializer, 'idempotency_key'));
            if (!hasHeader && !hasBodyKey) {
              const line = sourceFile.getLineAndCharacterOfPosition(urlProperty.getStart(sourceFile)).line + 1;
              violations.push(`${file.path}:${line} ${url}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return violations.sort();
}

export function findAPIManagedIdempotencyKeys(files: Array<{ path: string; source: string }>) {
  return files
    .filter(file => /crypto\.randomUUID\s*\(\s*\)/u.test(file.source))
    .map(file => file.path)
    .sort();
}

export function main(root = process.cwd()) {
  const paths = globSync('src/apps/**/api.ts', { cwd: root, absolute: true });
  const files = paths.map(path => ({ path: relative(root, path), source: readFileSync(path, 'utf8') }));
  const generatedKeys = findAPIManagedIdempotencyKeys(files);
  if (generatedKeys.length > 0) {
    throw new Error(
      `API modules must receive idempotency keys from the user-operation owner; UUID generation found in:\n${generatedKeys.join('\n')}`
    );
  }
  const missingKeys = findMutationRequestsWithoutIdempotency(files);
  if (missingKeys.length > 0) {
    throw new Error(
      `Mutation requests must explicitly carry the user-operation idempotency key:\n${missingKeys.join('\n')}`
    );
  }
  console.log('API mutations receive explicit idempotency keys from their user-operation owners.');
}

if (resolve(process.argv[1] || '') === resolve(import.meta.filename)) main();
