const DEFAULT_REMOTE_SEARCH_PAGE_SIZE = 50;
const MAX_REMOTE_SEARCH_PAGE_SIZE = 100;

export function remoteSearchPage(pageSize = DEFAULT_REMOTE_SEARCH_PAGE_SIZE) {
  const normalized = Number.isFinite(pageSize) ? Math.trunc(pageSize) : DEFAULT_REMOTE_SEARCH_PAGE_SIZE;
  return {
    page: 1,
    pageSize: Math.min(MAX_REMOTE_SEARCH_PAGE_SIZE, Math.max(1, normalized))
  } as const;
}
