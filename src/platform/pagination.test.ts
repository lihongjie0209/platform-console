import assert from 'node:assert/strict';
import test from 'node:test';
import { paginationRequest } from './pagination';

test('pagination requests use bounded positive integers', () => {
  assert.deepEqual(paginationRequest(2.9, 50.8), { page: 2, page_size: 50 });
  assert.deepEqual(paginationRequest(0, 0), { page: 1, page_size: 1 });
  assert.deepEqual(paginationRequest(Number.NaN, 500), { page: 1, page_size: 100 });
});
