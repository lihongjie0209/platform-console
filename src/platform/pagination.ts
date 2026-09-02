export function paginationRequest(page: number, pageSize: number, maximumPageSize = 100) {
  const normalizedMaximum = Math.max(1, Math.trunc(maximumPageSize));
  return {
    page: Math.max(1, Math.trunc(page) || 1),
    page_size: Math.min(normalizedMaximum, Math.max(1, Math.trunc(pageSize) || 1))
  };
}
