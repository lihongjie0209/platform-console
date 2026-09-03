import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from './optimistic-mutation';

test('state-changing actions reject a resource changed since it was shown', () => {
  assert.equal(hasPersistedStateChanged('draft', 'draft'), false);
  assert.equal(hasPersistedStateChanged('draft', 'published'), true);
});

test('lifecycle actions reject any persisted change after the list snapshot', () => {
  assert.equal(hasPersistedVersionChanged(3, 3), false);
  assert.equal(hasPersistedVersionChanged(3, 4), true);
});
