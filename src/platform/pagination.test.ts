import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkValues, collectAllPages, paginationRequest } from './pagination';

test('pagination requests use bounded positive integers', () => {
  assert.deepEqual(paginationRequest(2.9, 50.8), { page: 2, page_size: 50 });
  assert.deepEqual(paginationRequest(0, 0), { page: 1, page_size: 1 });
  assert.deepEqual(paginationRequest(Number.NaN, 500), { page: 1, page_size: 100 });
});

test('collectAllPages reads every page without truncating the final page', async () => {
  const requested: Array<[number, number]> = [];
  const values = await collectAllPages(async (page, pageSize) => {
    requested.push([page, pageSize]);
    const all = ['a', 'b', 'c', 'd', 'e'];
    return {
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      page_size: pageSize
    };
  }, 2);

  assert.deepEqual(values, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(requested, [
    [1, 2],
    [2, 2],
    [3, 2]
  ]);
});

test('collectAllPages rejects an incomplete or mismatched backend page', async () => {
  await assert.rejects(
    collectAllPages(async page => ({ items: page === 1 ? ['a'] : [], total: 2, page, page_size: 1 })),
    /提前结束/
  );
  await assert.rejects(
    collectAllPages(async () => ({ items: ['a'], total: 2, page: 2, page_size: 1 })),
    /页码不一致/
  );
});

test('chunkValues preserves order and the final partial batch', () => {
  assert.deepEqual(chunkValues([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkValues([], 100), []);
  assert.deepEqual(chunkValues([1, 2], 0), [[1], [2]]);
});
