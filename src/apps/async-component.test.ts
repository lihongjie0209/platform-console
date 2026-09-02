import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRetryApplicationLoad } from './async-load-policy';

test('application chunks retry one transient network load failure', () => {
  assert.equal(shouldRetryApplicationLoad(new TypeError('Failed to fetch dynamically imported module'), 1), true);
  assert.equal(shouldRetryApplicationLoad(new Error('ChunkLoadError: Loading chunk 42 failed'), 1), true);
  assert.equal(shouldRetryApplicationLoad(new Error('Loading chunk failed'), 2), false);
});

test('application chunks do not retry deterministic module errors', () => {
  assert.equal(shouldRetryApplicationLoad(new SyntaxError('Unexpected token'), 1), false);
  assert.equal(shouldRetryApplicationLoad('unknown error', 1), false);
});
