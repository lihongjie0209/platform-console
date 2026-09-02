import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import { formatFileSize, sha256Hex } from './file';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

test('sha256Hex returns a lowercase fixed-width digest', async () => {
  const digest = await sha256Hex(new Blob(['abc']));
  assert.equal(digest, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('formatFileSize formats common binary units', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(1024), '1.00 KB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.00 MB');
});
