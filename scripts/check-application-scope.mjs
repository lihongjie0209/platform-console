import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const appsDirectory = new URL('../src/apps/', import.meta.url);
const applicationScopePair = /tenant_id\s*:\s*[^,;\n]+,\s*application_id\s*:/g;
const reverseApplicationScopePair = /application_id\s*:\s*[^,;\n]+,\s*tenant_id\s*:/g;

const entries = (await readdir(appsDirectory, { withFileTypes: true })).filter(
  entry => entry.isDirectory() && entry.name !== 'platform-admin'
);
const adapters = await Promise.all(
  entries.map(async entry => {
    try {
      return { name: entry.name, source: await readFile(new URL(`${entry.name}/api.ts`, appsDirectory), 'utf8') };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  })
);

for (const adapter of adapters.filter(
  value => value && value.source.includes('tenant_id') && value.source.includes('application_id')
)) {
  assert.match(
    adapter.source,
    /\bapplication(?:Filter)?Scope\s*\(/,
    `${adapter.name}/api.ts must validate tenant and application scope through the shared helper`
  );
  assert.doesNotMatch(
    adapter.source,
    applicationScopePair,
    `${adapter.name}/api.ts must not manually assemble tenant_id and application_id`
  );
  assert.doesNotMatch(
    adapter.source,
    reverseApplicationScopePair,
    `${adapter.name}/api.ts must not manually assemble application_id and tenant_id`
  );
}
