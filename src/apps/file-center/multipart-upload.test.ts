import assert from 'node:assert/strict';
import test from 'node:test';
import { multipartBuckets, multipartRanges } from './multipart-upload';

test('multipartRanges covers every byte exactly once', () => {
  assert.deepEqual(multipartRanges(11, 5), [
    { partNumber: 1, start: 0, end: 5 },
    { partNumber: 2, start: 5, end: 10 },
    { partNumber: 3, start: 10, end: 11 }
  ]);
  assert.deepEqual(multipartRanges(10, 5), [
    { partNumber: 1, start: 0, end: 5 },
    { partNumber: 2, start: 5, end: 10 }
  ]);
});

test('multipartRanges rejects unsafe input', () => {
  assert.throws(() => multipartRanges(0, 5));
  assert.throws(() => multipartRanges(10, 0));
  assert.throws(() => multipartRanges(Number.MAX_SAFE_INTEGER + 1, 5));
});

test('multipartBuckets limits workers while preserving every part', () => {
  assert.deepEqual(multipartBuckets([1, 2, 3, 4, 5, 6, 7], 3), [
    [1, 4, 7],
    [2, 5],
    [3, 6]
  ]);
  assert.deepEqual(multipartBuckets([], 3), []);
  assert.deepEqual(multipartBuckets([1, 2], 3), [[1], [2]]);
  assert.throws(() => multipartBuckets([1], 0));
});
