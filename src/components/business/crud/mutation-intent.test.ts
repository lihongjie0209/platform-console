import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createBizCrudMutationIntent } from './mutation-intent';

describe('createBizCrudMutationIntent', () => {
  it('retains the key for a retry of the same operation and payload', () => {
    let sequence = 0;
    const intent = createBizCrudMutationIntent(() => {
      sequence += 1;
      return `key-${sequence}`;
    });

    assert.equal(intent.context('create', { name: 'Portal' }).idempotencyKey, 'key-1');
    assert.equal(intent.context('create', { name: 'Portal' }).idempotencyKey, 'key-1');
  });

  it('starts a new intent when payload changes or the operation is reset', () => {
    let sequence = 0;
    const intent = createBizCrudMutationIntent(() => {
      sequence += 1;
      return `key-${sequence}`;
    });

    assert.equal(intent.context('edit:app-1', { name: 'Portal' }).idempotencyKey, 'key-1');
    assert.equal(intent.context('edit:app-1', { name: 'Console' }).idempotencyKey, 'key-2');
    intent.reset();
    assert.equal(intent.context('edit:app-1', { name: 'Console' }).idempotencyKey, 'key-3');
  });
});
