import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findAPIManagedIdempotencyKeys,
  findMutationRequestsWithoutIdempotency
} from './check-idempotency-key-ownership';

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

test('rejects a mutation request that relies on a per-request fallback key', () => {
  assert.deepEqual(
    findMutationRequestsWithoutIdempotency([
      {
        path: 'src/apps/orders/api.ts',
        source: `request({ url: '/api/v1/orders/cancel', method: 'post', data: { id: input.id } });`
      }
    ]),
    ['src/apps/orders/api.ts:1 /api/v1/orders/cancel']
  );
});

test('accepts mutation keys in a header or the explicit transport body', () => {
  assert.deepEqual(
    findMutationRequestsWithoutIdempotency([
      {
        path: 'src/apps/orders/api.ts',
        source: `
          request({
            url: '/api/v1/orders/create',
            method: 'post',
            headers: { 'Idempotency-Key': input.idempotencyKey },
            data: input
          });
          request({
            url: '/api/v1/orders/retry',
            method: 'post',
            data: { id: input.id, idempotency_key: input.idempotencyKey }
          });
          request({ url: '/api/v1/orders/list', method: 'post', data: input });
        `
      }
    ]),
    []
  );
});
