import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const applicationsRoot = path.join(projectRoot, 'src', 'apps');
const sourceExtensions = new Set(['.ts', '.tsx', '.vue']);
const packageJSON = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
const testCommand = packageJSON.scripts?.test || '';
const applicationNames = new Set(
  (await readdir(applicationsRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(target);
      return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
    })
  );
  return nested.flat();
}

function targetApplication(sourceFile, specifier) {
  let relativeTarget = '';
  if (specifier.startsWith('@/apps/')) {
    relativeTarget = specifier.slice('@/apps/'.length);
  } else if (specifier.startsWith('.')) {
    relativeTarget = path.relative(applicationsRoot, path.resolve(path.dirname(sourceFile), specifier));
  } else {
    return '';
  }
  const [candidate] = relativeTarget.split(path.sep);
  return candidate && applicationNames.has(candidate) ? candidate : '';
}

const violations = (
  await Promise.all(
    Array.from(applicationNames, async application => {
      const files = await sourceFiles(path.join(applicationsRoot, application));
      return Promise.all(
        files.map(async sourceFile => {
          const source = await readFile(sourceFile, 'utf8');
          return Array.from(source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g), match => {
            const target = targetApplication(sourceFile, match[1]);
            return target && target !== application
              ? `${path.relative(projectRoot, sourceFile)} imports application ${target}: ${match[1]}`
              : '';
          }).filter(Boolean);
        })
      );
    })
  )
).flat(2);

const shellFiles = (await sourceFiles(path.join(projectRoot, 'src'))).filter(
  sourceFile =>
    !path
      .relative(applicationsRoot, sourceFile)
      .split(path.sep)
      .every(segment => segment !== '..')
);
const shellViolations = (
  await Promise.all(
    shellFiles.map(async sourceFile => {
      const source = await readFile(sourceFile, 'utf8');
      return Array.from(source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["']([^"']+)["']/g), match => {
        const target = targetApplication(sourceFile, match[1]);
        return target ? `${path.relative(projectRoot, sourceFile)} imports application ${target}: ${match[1]}` : '';
      }).filter(Boolean);
    })
  )
).flat();

assert.deepEqual(
  [...violations, ...shellViolations],
  [],
  `application internals may be imported only by their own application or the src/apps composition layer:\n${[
    ...violations,
    ...shellViolations
  ].join('\n')}`
);

const testDirectories = new Set(
  (await sourceFiles(applicationsRoot))
    .filter(sourceFile => sourceFile.endsWith('.test.ts') || sourceFile.endsWith('.test.tsx'))
    .map(sourceFile => path.relative(projectRoot, path.dirname(sourceFile)).split(path.sep).join('/'))
);
const uncoveredTestDirectories = Array.from(testDirectories).filter(
  directory => !testCommand.split(/\s+/).includes(`${directory}/*.test.ts`)
);
assert.deepEqual(
  uncoveredTestDirectories,
  [],
  `every application-owned test directory must be included in pnpm test:\n${uncoveredTestDirectories.join('\n')}`
);
