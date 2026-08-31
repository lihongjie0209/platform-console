import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJSONArray, parseJSONObject } from './json';
test('workflow JSON helpers enforce object and array shapes', () => {
  assert.deepEqual(parseJSONObject('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJSONArray('[{"id":"start"}]', '节点'), [{ id: 'start' }]);
  assert.throws(() => parseJSONObject('[]'), /JSON 对象/);
  assert.throws(() => parseJSONArray('{}', '节点'), /JSON 数组/);
});
