export interface PartRange {
  partNumber: number;
  start: number;
  end: number;
}

export function multipartRanges(size: number, partSize: number): PartRange[] {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('file size must be a positive safe integer');
  if (!Number.isSafeInteger(partSize) || partSize <= 0) throw new Error('part size must be a positive safe integer');

  const count = Math.ceil(size / partSize);
  return Array.from({ length: count }, (_, index) => ({
    partNumber: index + 1,
    start: index * partSize,
    end: Math.min(size, (index + 1) * partSize)
  }));
}

export function multipartBuckets<T>(values: readonly T[], concurrency: number): T[][] {
  if (!Number.isSafeInteger(concurrency) || concurrency <= 0) {
    throw new Error('concurrency must be a positive safe integer');
  }
  if (values.length === 0) return [];

  const buckets = Array.from({ length: Math.min(concurrency, values.length) }, () => [] as T[]);
  values.forEach((value, index) => buckets[index % buckets.length].push(value));
  return buckets;
}
