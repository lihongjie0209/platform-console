import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJSONObject } from './json';

test('parseJSONObject accepts objects and rejects other JSON values', () => {
  assert.deepEqual(parseJSONObject('{"color":"blue"}'), { color: 'blue' });
  assert.deepEqual(parseJSONObject(''), {});
  assert.throws(() => parseJSONObject('[]'), /JSON 对象/);
  assert.throws(() => parseJSONObject('{broken'), /合法 JSON/);
});
