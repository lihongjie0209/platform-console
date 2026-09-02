import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPlatformDateTime } from './date-time';

test('platform timestamps render in Asia/Shanghai', () => {
  assert.equal(formatPlatformDateTime('2026-09-02T00:00:00Z'), '2026-09-02 08:00:00');
  assert.equal(formatPlatformDateTime('invalid'), '-');
  assert.equal(formatPlatformDateTime(undefined), '-');
});
