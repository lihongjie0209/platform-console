import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJSONArray, parseJSONObject } from './json';

test('shared JSON editors enforce their expected root type', () => {
  assert.deepEqual(parseJSONObject('{"seats":10}', '权益'), { seats: 10 });
  assert.deepEqual(parseJSONArray('[{"up_to":100}]', '阶梯'), [{ up_to: 100 }]);
  assert.throws(() => parseJSONObject('[]', '权益'), /JSON 对象/);
  assert.throws(() => parseJSONArray('{}', '阶梯'), /JSON 数组/);
});
