import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const services = [
  'IDENTITY',
  'TENANT',
  'AUTHORIZATION',
  'APPLICATION',
  'AUDIT',
  'CONFIG',
  'NOTIFICATION',
  'FILE',
  'SCHEDULER',
  'DICTIONARY',
  'SERVICE_REGISTRY',
  'WEBHOOK',
  'WORKFLOW',
  'SEARCH',
  'METERING',
  'BILLING',
  'RULE',
  'DATA_EXPORT',
  'IMPORT',
  'SWAGGER'
];
const [entrypoint, template, developmentConfig] = await Promise.all([
  readFile(new URL('../docker/40-platform-runtime-config.sh', import.meta.url), 'utf8'),
  readFile(new URL('../docker/platform-config.js.template', import.meta.url), 'utf8'),
  readFile(new URL('../public/platform-config.js', import.meta.url), 'utf8')
]);

for (const service of services) {
  const variable = `PLATFORM_${service}_URL`;
  assert.match(entrypoint, new RegExp(`:\\s+"\\$\\{${variable}:=`), `${variable} must have an optional default`);
  assert.match(entrypoint, new RegExp(`\\$\\{${variable}\\}`), `${variable} must be included in envsubst`);
  assert.match(template, new RegExp(`\\$\\{${variable}\\}`), `${variable} must be rendered into runtime config`);
  const serviceKey = service.toLowerCase().replaceAll('_', '-');
  assert.match(
    developmentConfig,
    new RegExp(`['"]?${serviceKey}['"]?\\s*:`),
    `${serviceKey} must exist in development runtime config`
  );
}
