import assert from 'node:assert/strict';
import test from 'node:test';
import { remoteSearchPage } from './remote-search';

test('remote search explicitly uses one bounded result page', () => {
  assert.deepEqual(remoteSearchPage(), { page: 1, pageSize: 50 });
  assert.deepEqual(remoteSearchPage(500), { page: 1, pageSize: 100 });
  assert.deepEqual(remoteSearchPage(0), { page: 1, pageSize: 1 });
  assert.deepEqual(remoteSearchPage(Number.NaN), { page: 1, pageSize: 50 });
});
