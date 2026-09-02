import assert from 'node:assert/strict';
import test from 'node:test';
import {
  importDatasetKey,
  importStatusLabel,
  importTemplateCSV,
  selectedImportDataset,
  supportedImportFormat
} from './import-form';

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

test('import statuses have user-facing labels and preserve unknown values', () => {
  assert.equal(importStatusLabel('validation_failed'), '校验未通过');
  assert.equal(importStatusLabel('future_status'), 'future_status');
});

test('import format remains valid for the selected provider capability', () => {
  assert.equal(supportedImportFormat(dataset, 'xlsx'), 'xlsx');
  assert.equal(supportedImportFormat(dataset, 'jsonl'), 'csv');
  assert.equal(supportedImportFormat(undefined, 'csv'), '');
});

test('CSV template follows provider column order and escapes examples', () => {
  assert.equal(
    importTemplateCSV([
      { key: 'code', example: 'basic' },
      { key: 'name', example: 'Basic, "Monthly"' }
    ]),
    'code,name\r\nbasic,"Basic, ""Monthly"""\r\n'
  );
  assert.equal(importTemplateCSV([{ key: 'id' }]), 'id\r\n');
});
