import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { globSync } from 'tinyglobby';

export function findAPIManagedIdempotencyKeys(files: Array<{ path: string; source: string }>) {
  return files
    .filter(file => /crypto\.randomUUID\s*\(\s*\)/u.test(file.source))
    .map(file => file.path)
    .sort();
}

export function main(root = process.cwd()) {
  const paths = globSync('src/apps/**/api.ts', { cwd: root, absolute: true });
  const violations = findAPIManagedIdempotencyKeys(
    paths.map(path => ({ path: relative(root, path), source: readFileSync(path, 'utf8') }))
  );
  if (violations.length > 0) {
    throw new Error(
      `API modules must receive idempotency keys from the user-operation owner; UUID generation found in:\n${violations.join('\n')}`
    );
  }
  console.log('API modules receive idempotency keys from their user-operation owners.');
}

if (resolve(process.argv[1] || '') === resolve(import.meta.filename)) main();
