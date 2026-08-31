import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNotificationVariables } from './variables';

test('parseNotificationVariables accepts only string maps', () => {
  assert.deepEqual(parseNotificationVariables('{"name":"Alice"}'), { name: 'Alice' });
  assert.throws(() => parseNotificationVariables('["Alice"]'), /JSON 对象/);
  assert.throws(() => parseNotificationVariables('{"count":1}'), /必须全部是字符串/);
});
