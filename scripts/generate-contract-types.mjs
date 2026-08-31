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

await Promise.all([mkdir(openAPIDir, { recursive: true }), mkdir(typesDir, { recursive: true })]);

await Promise.all(
  Object.entries(manifest).map(async ([service, sourceURL]) => {
    const response = await fetch(sourceURL);
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
