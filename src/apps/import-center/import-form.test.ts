import assert from 'node:assert/strict';
import test from 'node:test';
import { importDatasetKey, selectedImportDataset, supportedImportFormat } from './import-form';

const dataset = {
  provider_service: 'billing-service',
  code: 'billing.plans',
  title: 'Plans',
  formats: ['csv', 'xlsx'],
  healthy_instances: 2
};

test('import dataset key keeps provider identity with the dataset code', () => {
  const key = importDatasetKey(dataset);
  assert.equal(selectedImportDataset([dataset], key), dataset);
  assert.equal(
    selectedImportDataset([dataset], importDatasetKey({ ...dataset, provider_service: 'other' })),
    undefined
  );
});

test('import format remains valid for the selected provider capability', () => {
  assert.equal(supportedImportFormat(dataset, 'xlsx'), 'xlsx');
  assert.equal(supportedImportFormat(dataset, 'jsonl'), 'csv');
  assert.equal(supportedImportFormat(undefined, 'csv'), '');
});
