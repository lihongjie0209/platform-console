const maxHistoryEntries = 100;

export interface ApplicationRouteHistoryEntry {
  subject: string;
  tenantId: string;
  applicationId: string;
  path: string;
}

export function normalizeApplicationRouteHistory(value: unknown): ApplicationRouteHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .flatMap(entry => {
      const subject = typeof entry.subject === 'string' ? entry.subject.trim() : '';
      const tenantId = typeof entry.tenantId === 'string' ? entry.tenantId.trim() : '';
      const applicationId = typeof entry.applicationId === 'string' ? entry.applicationId.trim() : '';
      const path = typeof entry.path === 'string' ? entry.path.trim() : '';
      return subject && tenantId && applicationId && path.startsWith('/apps/')
        ? [{ subject, tenantId, applicationId, path }]
        : [];
    })
    .slice(0, maxHistoryEntries);
}

export function lastApplicationPath(
  history: ApplicationRouteHistoryEntry[],
  scope: Omit<ApplicationRouteHistoryEntry, 'path'>
) {
  return history.find(
    entry =>
      entry.subject === scope.subject &&
      entry.tenantId === scope.tenantId &&
      entry.applicationId === scope.applicationId
  )?.path;
}

export function recordApplicationPath(
  history: ApplicationRouteHistoryEntry[],
  entry: ApplicationRouteHistoryEntry
): ApplicationRouteHistoryEntry[] {
  const normalized = normalizeApplicationRouteHistory([entry])[0];
  if (!normalized) return history;
  const safeHistory = normalizeApplicationRouteHistory(history);
  return [
    normalized,
    ...safeHistory.filter(
      item =>
        item.subject !== normalized.subject ||
        item.tenantId !== normalized.tenantId ||
        item.applicationId !== normalized.applicationId
    )
  ].slice(0, maxHistoryEntries);
}
