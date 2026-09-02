export function paginationRequest(page: number, pageSize: number, maximumPageSize = 100) {
  const normalizedMaximum = Math.max(1, Math.trunc(maximumPageSize));
  return {
    page: Math.max(1, Math.trunc(page) || 1),
    page_size: Math.min(normalizedMaximum, Math.max(1, Math.trunc(pageSize) || 1))
  };
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Reads a bounded backend page contract until every reported item has been collected. */
export async function collectAllPages<T>(
  load: (page: number, pageSize: number) => Promise<PageResult<T>>,
  pageSize = 100
) {
  const size = paginationRequest(1, pageSize).page_size;
  const readPage = async (page: number, items: T[]): Promise<T[]> => {
    const result = await load(page, size);
    if (result.page !== page) throw new Error(`分页响应页码不一致：请求 ${page}，收到 ${result.page}`);
    if (!Number.isSafeInteger(result.total) || result.total < 0) throw new Error('分页响应总数无效');
    if (!Array.isArray(result.items)) throw new Error('分页响应列表无效');

    items.push(...result.items);
    if (items.length >= result.total) return items.slice(0, result.total);
    if (!result.items.length) throw new Error(`分页响应在第 ${page} 页提前结束`);
    return readPage(page + 1, items);
  };

  return readPage(1, []);
}

/** Splits values for backend batch endpoints without dropping the tail batch. */
export function chunkValues<T>(values: readonly T[], size: number): T[][] {
  const normalizedSize = Math.max(1, Math.trunc(size) || 1);
  return Array.from({ length: Math.ceil(values.length / normalizedSize) }, (_, index) =>
    values.slice(index * normalizedSize, (index + 1) * normalizedSize)
  );
}
