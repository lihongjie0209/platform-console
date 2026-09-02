import assert from 'node:assert/strict';
import test from 'node:test';
import { datasetKey, descriptorDefaults, findDataset } from './export-form';

test('dataset selection keeps provider and dataset together', () => {
  const values = [
    {
      provider_service: 'billing-service',
      code: 'billing.invoices',
      title: 'Invoices',
      formats: ['csv'],
      healthy_instances: 2
    }
  ];
  assert.equal(findDataset(values, datasetKey(values[0]!)), values[0]);
  assert.equal(findDataset(values, 'other\u0000billing.invoices'), undefined);
});

test('descriptor defaults select supported format and all named columns', () => {
  assert.deepEqual(
    descriptorDefaults({ code: 'x', title: 'X', formats: ['jsonl', 'csv'], columns: [{ key: 'id' }, {}] }),
    { format: 'jsonl', columns: ['id'] }
  );
});
