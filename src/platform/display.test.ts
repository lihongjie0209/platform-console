import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPlatformBytes } from './display';

test('formats task object sizes for human-readable details', () => {
  assert.equal(formatPlatformBytes(0), '0 B');
  assert.equal(formatPlatformBytes(1536), '1.5 KB');
  assert.equal(formatPlatformBytes(2 * 1024 * 1024), '2 MB');
  assert.equal(formatPlatformBytes(undefined), '-');
  assert.equal(formatPlatformBytes(-1), '-');
});
