import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRequestJSON } from './request-json';

test('normalizeRequestJSON validates and compacts protobuf JSON', () => {
  assert.equal(normalizeRequestJSON(''), '{}');
  assert.equal(normalizeRequestJSON('{ "tenantId": "tenant-1" }'), '{"tenantId":"tenant-1"}');
  assert.throws(() => normalizeRequestJSON('[]'), /JSON 对象/);
  assert.throws(() => normalizeRequestJSON('{broken'), /合法 JSON/);
});
