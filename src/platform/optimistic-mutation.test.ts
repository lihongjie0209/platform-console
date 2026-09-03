import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPersistedStateChanged } from './optimistic-mutation';

test('state-changing actions reject a resource changed since it was shown', () => {
  assert.equal(hasPersistedStateChanged('draft', 'draft'), false);
  assert.equal(hasPersistedStateChanged('draft', 'published'), true);
});
