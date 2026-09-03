import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureIdempotencyKey, operationIdempotencyKey, operationPhaseIdempotencyKey } from './idempotency-key';

test('ensureIdempotencyKey retains an existing operation key', () => {
  let generated = 0;
  const generate = () => {
    generated += 1;
    return `key-${generated}`;
  };

  const first = ensureIdempotencyKey('', generate);
  const retry = ensureIdempotencyKey(first, generate);

  assert.equal(first, 'key-1');
  assert.equal(retry, first);
  assert.equal(generated, 1);
});

test('operationIdempotencyKey isolates operations and retains retry keys', () => {
  const keys = new Map<string, string>();
  let generated = 0;
  const generate = () => {
    generated += 1;
    return `key-${generated}`;
  };

  assert.equal(operationIdempotencyKey(keys, 'job-1:retry', generate), 'key-1');
  assert.equal(operationIdempotencyKey(keys, 'job-1:retry', generate), 'key-1');
  assert.equal(operationIdempotencyKey(keys, 'job-2:retry', generate), 'key-2');
});

test('operation phases have stable independent idempotency namespaces', () => {
  assert.equal(operationPhaseIdempotencyKey('operation-1', 'complete'), 'operation-1:complete');
  assert.throws(() => operationPhaseIdempotencyKey('', 'complete'), /required/u);
});
