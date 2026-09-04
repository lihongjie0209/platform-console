import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureIdempotencyKey,
  operationIdempotencyKey,
  operationPhaseIdempotencyKey,
  operationPromise,
  operationValue
} from './idempotency-key';

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

test('operationValue retains fingerprint fields across retries', () => {
  const values = new Map<string, string>();
  let generated = 0;
  const create = () => {
    generated += 1;
    return `due-${generated}`;
  };

  assert.equal(operationValue(values, 'invoice-1:finalize', create), 'due-1');
  assert.equal(operationValue(values, 'invoice-1:finalize', create), 'due-1');
  assert.equal(generated, 1);
});

test('operationPromise retains a resolved baseline and evicts a rejected read', async () => {
  const values = new Map<string, Promise<number>>();
  let calls = 0;
  const load = async () => {
    calls += 1;
    if (calls === 1) throw new Error('temporary read failure');
    return 7;
  };

  await assert.rejects(operationPromise(values, 'rotate:account-1', load), /temporary read failure/);
  assert.equal(await operationPromise(values, 'rotate:account-1', load), 7);
  assert.equal(await operationPromise(values, 'rotate:account-1', load), 7);
  assert.equal(calls, 2);
});
