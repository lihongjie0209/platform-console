import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const manifest = JSON.parse(await readFile(path.join(rootDir, 'contracts/services.json'), 'utf8'));
const outputDir = path.join(rootDir, 'src/service/contracts');
const openAPIDir = path.join(outputDir, 'openapi');
const typesDir = path.join(outputDir, 'generated');
const binDir = path.join(rootDir, 'node_modules/.bin');

async function fetchWithRetry(url, attempts = 3, attempt = 1) {
  try {
    const response = await fetch(url);
    if (response.ok || response.status < 500) return response;
    if (attempt >= attempts) return response;
  } catch (error) {
    if (attempt >= attempts) {
      throw new Error(`unable to download contract after ${attempts} attempts`, { cause: error });
    }
  }
  await new Promise(resolve => {
    setTimeout(resolve, 500 * 2 ** (attempt - 1));
  });
  return fetchWithRetry(url, attempts, attempt + 1);
}

await Promise.all([mkdir(openAPIDir, { recursive: true }), mkdir(typesDir, { recursive: true })]);

await Promise.all(
  Object.entries(manifest).map(async ([service, sourceURL]) => {
    const separator = sourceURL.includes('?') ? '&' : '?';
    const response = await fetchWithRetry(`${sourceURL}${separator}contract_refresh=${Date.now()}`);
    if (!response.ok)
      throw new Error(`unable to download ${service} contract: ${response.status} ${response.statusText}`);

    const swaggerPath = path.join(openAPIDir, `${service}.swagger.json`);
    const openAPIPath = path.join(openAPIDir, `${service}.json`);
    const typesPath = path.join(typesDir, `${service}.d.ts`);

    await writeFile(swaggerPath, await response.text());
    await run(path.join(binDir, 'swagger2openapi'), [swaggerPath, '--outfile', openAPIPath]);
    await run(path.join(binDir, 'openapi-typescript'), [openAPIPath, '-o', typesPath]);
    await rm(swaggerPath);
  })
);
