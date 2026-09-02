import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExportQuery, datasetKey, descriptorDefaults, exportQueryDefaults, findDataset } from './export-form';

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

test('provider query schema controls defaults and submitted properties', () => {
  const descriptor = {
    code: 'billing.invoices',
    title: 'Invoices',
    formats: ['csv'],
    columns: [],
    query_fields: [
      { key: 'status', title: 'Status', type: 'string', required: true },
      { key: 'created_from', type: 'datetime' }
    ]
  };
  assert.deepEqual(exportQueryDefaults(descriptor), { status: undefined, created_from: undefined });
  assert.deepEqual(buildExportQuery(descriptor, { status: 'paid', created_from: '' }), { status: 'paid' });
  assert.throws(() => buildExportQuery(descriptor, {}), /Status不能为空/);
});

test('descriptor defaults select supported format and all named columns', () => {
  assert.deepEqual(
    descriptorDefaults({
      code: 'x',
      title: 'X',
      formats: ['jsonl', 'csv'],
      columns: [{ key: 'id' }, {}],
      query_fields: []
    }),
    { format: 'jsonl', columns: ['id'] }
  );
});
