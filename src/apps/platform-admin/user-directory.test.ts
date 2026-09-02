import assert from 'node:assert/strict';
import test from 'node:test';
import { boundedDistinctIDs, mergeUserDirectory } from './user-directory';

test('user directory merges page hydration with remote search results by identity', () => {
  assert.deepEqual(
    mergeUserDirectory(
      [
        { id: 'user-1', name: 'old' },
        { id: 'user-2', name: 'Bob' }
      ],
      [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-3', name: 'Carol' }
      ]
    ),
    [
      { id: 'user-1', name: 'Alice' },
      { id: 'user-2', name: 'Bob' },
      { id: 'user-3', name: 'Carol' }
    ]
  );
});

test('batch identity lookup IDs are normalized, distinct, and bounded', () => {
  assert.deepEqual(boundedDistinctIDs([' user-1 ', '', 'user-1', 'user-2']), ['user-1', 'user-2']);
  assert.equal(boundedDistinctIDs(Array.from({ length: 120 }, (_, index) => `user-${index}`)).length, 100);
});
