import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogSearch } from './catalog';

test('catalog search trims and bounds Unicode input', () => {
  assert.equal(catalogSearch('  billing invoices  '), 'billing invoices');
  assert.equal(catalogSearch('账单数据', 2), '账单');
  assert.equal(catalogSearch('ignored', 0), 'i');
});
