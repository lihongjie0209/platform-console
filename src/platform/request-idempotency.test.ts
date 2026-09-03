import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRequestIdempotencyKey } from './request-idempotency';

test('request header uses the business operation idempotency key', () => {
  let generated = false;
  const key = resolveRequestIdempotencyKey({ idempotency_key: ' operation-1 ' }, undefined, () => {
    generated = true;
    return 'attempt-1';
  });

  assert.equal(key, 'operation-1');
  assert.equal(generated, false);
});

test('request retries preserve an existing idempotency header', () => {
  const key = resolveRequestIdempotencyKey({ idempotency_key: 'body-key' }, 'header-key', () => 'new-key');
  assert.equal(key, 'header-key');
});

test('other mutations receive a generated operation key', () => {
  assert.equal(
    resolveRequestIdempotencyKey({ name: 'example' }, undefined, () => 'generated-key'),
    'generated-key'
  );
});
