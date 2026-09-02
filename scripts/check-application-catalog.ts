import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'yaml';
import { applicationModules } from '../src/apps/registry';
import { isApplicationCategory } from '../src/apps/categories';

interface CatalogMenu {
  type?: string;
  component?: string;
}

interface CatalogApplication {
  code?: string;
  metadata?: Record<string, unknown>;
  menus?: CatalogMenu[];
}

interface CatalogDocument {
  applications?: CatalogApplication[];
}

const configuredPath = process.env.PLATFORM_APPLICATION_CATALOG;
const catalogPath = path.resolve(
  process.cwd(),
  configuredPath || '../../services/application-service/bootstrap/platform-applications.yaml'
);
const document = parse(await readFile(catalogPath, 'utf8')) as CatalogDocument;
const catalog = document.applications ?? [];

const catalogCodes = catalog.map(application => application.code || '');
assert.equal(new Set(catalogCodes).size, catalogCodes.length, 'application catalog codes must be unique');
assert.ok(catalogCodes.every(Boolean), 'application catalog codes must not be empty');

const moduleByCode = new Map(applicationModules.map(module => [module.code, module]));
assert.deepEqual(
  [...moduleByCode.keys()].sort(),
  [...catalogCodes].sort(),
  'every built-in application must have exactly one console manifest'
);

for (const application of catalog) {
  const code = application.code!;
  const module = moduleByCode.get(code)!;
  const category = application.metadata?.category;
  assert.ok(isApplicationCategory(category), `application ${code} must declare a valid metadata.category`);
  assert.equal(module.category, category, `application ${code} category differs between catalog and console manifest`);

  const catalogPages = (application.menus ?? [])
    .filter(menu => (menu.type || 'page') === 'page')
    .map(menu => menu.component || '')
    .filter(Boolean)
    .sort();
  assert.deepEqual(
    [...module.pages].sort(),
    catalogPages,
    `application ${code} page components differ between catalog and console manifest`
  );
}

console.log(`Verified ${catalog.length} applications against ${catalogPath}`);
