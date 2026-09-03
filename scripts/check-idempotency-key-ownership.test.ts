import assert from 'node:assert/strict';
import test from 'node:test';
import { findAPIManagedIdempotencyKeys } from './check-idempotency-key-ownership';

test('rejects API modules that create a new key for each HTTP attempt', () => {
  assert.deepEqual(
    findAPIManagedIdempotencyKeys([
      { path: 'src/apps/orders/api.ts', source: 'const body = { idempotency_key: crypto.randomUUID() };' }
    ]),
    ['src/apps/orders/api.ts']
  );
});

test('accepts API modules that receive the operation key from their caller', () => {
  assert.deepEqual(
    findAPIManagedIdempotencyKeys([
      { path: 'src/apps/orders/api.ts', source: 'const body = { idempotency_key: input.idempotencyKey };' }
    ]),
    []
  );
});
