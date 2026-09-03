import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPersistedStateChanged, isTaskActionable } from './mutation';

test('state-changing actions reject a resource changed since it was shown', () => {
  assert.equal(hasPersistedStateChanged('draft', 'draft'), false);
  assert.equal(hasPersistedStateChanged('draft', 'published'), true);
});

test('only unfinished workflow tasks accept user mutations', () => {
  assert.equal(isTaskActionable('pending'), true);
  assert.equal(isTaskActionable('claimed'), true);
  assert.equal(isTaskActionable('completed'), false);
  assert.equal(isTaskActionable('cancelled'), false);
});
