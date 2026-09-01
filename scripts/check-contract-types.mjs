import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputDir = path.join(rootDir, 'src/service/contracts');
const snapshotDir = await mkdtemp(path.join(os.tmpdir(), 'platform-console-contracts-'));
const generatedOutputDir = path.join(snapshotDir, 'contracts');

try {
  await run(process.execPath, [path.join(scriptDir, 'generate-contract-types.mjs')], {
    cwd: rootDir,
    env: { ...process.env, CONTRACT_OUTPUT_DIR: generatedOutputDir }
  });
  await run('diff', ['-qr', generatedOutputDir, outputDir]);
} finally {
  await rm(snapshotDir, { recursive: true, force: true });
}
