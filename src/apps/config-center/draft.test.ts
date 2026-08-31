import assert from 'node:assert/strict';
import test from 'node:test';
import { parseConfigJSON, validateSecretReference } from './draft';

test('parseConfigJSON preserves scalar and structured JSON values', () => {
  assert.equal(parseConfigJSON('true'), true);
  assert.deepEqual(parseConfigJSON('{"limit":5}'), { limit: 5 });
  assert.throws(() => parseConfigJSON('{'), /不是合法 JSON/);
});

test('validateSecretReference trims and rejects empty references', () => {
  assert.equal(validateSecretReference(' secret://orders/api-key '), 'secret://orders/api-key');
  assert.throws(() => validateSecretReference('   '), /不能为空/);
});
