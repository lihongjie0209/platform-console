import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const applicationsRoot = path.join(projectRoot, 'src', 'apps');
const manifest = JSON.parse(await readFile(path.join(projectRoot, 'dist', '.vite', 'manifest.json'), 'utf8'));

async function applicationPages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(entry => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return applicationPages(target);
      if (entry.name !== 'index.vue' || !target.includes(`${path.sep}pages${path.sep}`)) return [];
      return [path.relative(projectRoot, target).split(path.sep).join('/')];
    })
  );
  return nested.flat();
}

const pages = await applicationPages(applicationsRoot);
assert.ok(pages.length > 0, 'at least one application page must be registered');

for (const page of pages) {
  const chunk = manifest[page];
  assert.ok(chunk, `${page} is missing from the production build manifest`);
  assert.equal(chunk.isDynamicEntry, true, `${page} must remain a dynamic application entry`);
}

const mainEntry = Object.values(manifest).find(chunk => chunk.isEntry && chunk.src === 'index.html');
assert.ok(mainEntry, 'production build manifest is missing the index.html entry');
const applicationPageChunks = new Set(pages.map(page => manifest[page].file));
const staticImports = new Set();
function collectStaticImports(chunk) {
  for (const source of chunk.imports || []) {
    if (!staticImports.has(source)) {
      staticImports.add(source);
      if (manifest[source]) collectStaticImports(manifest[source]);
    }
  }
}
collectStaticImports(mainEntry);
for (const source of staticImports) {
  const chunk = manifest[source];
  assert.ok(chunk, `${source} is referenced by the main entry but missing from the build manifest`);
  assert.equal(
    applicationPageChunks.has(chunk.file),
    false,
    `${source} is statically reachable from the main entry and would preload an application page`
  );
}
