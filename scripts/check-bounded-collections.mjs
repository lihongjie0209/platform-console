import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const applicationsRoot = path.resolve('src/apps');
const sourceExtensions = new Set(['.ts', '.vue']);
const fixedFirstPage = /\bpage\s*:\s*1\b/g;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(absolute);
      return sourceExtensions.has(path.extname(entry.name)) && !entry.name.endsWith('.test.ts') ? [absolute] : [];
    })
  );
  return nested.flat();
}

const files = await sourceFiles(applicationsRoot);
const sources = await Promise.all(files.map(async filename => [filename, await readFile(filename, 'utf8')]));
const violations = [];
for (const [filename, source] of sources) {
  for (const match of source.matchAll(fixedFirstPage)) {
    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${path.relative(process.cwd(), filename)}:${line}`);
  }
}

if (violations.length) {
  console.error('Application requests must not hard-code page: 1. Use page state or collectAllPages:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log('Application collection requests use explicit pagination state.');
}
