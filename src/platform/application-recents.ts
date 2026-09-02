const maxApplicationsPerScope = 6;
const maxScopes = 20;

export interface RecentApplicationScope {
  subject: string;
  tenantId: string;
  applicationIds: string[];
}

interface RecentApplicationVisit {
  subject: string;
  tenantId: string;
  applicationId: string;
}

export function normalizeRecentApplicationScopes(value: unknown): RecentApplicationScope[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((scope): scope is Record<string, unknown> => Boolean(scope) && typeof scope === 'object')
    .flatMap(scope => {
      const subject = typeof scope.subject === 'string' ? scope.subject.trim() : '';
      const tenantId = typeof scope.tenantId === 'string' ? scope.tenantId.trim() : '';
      if (!subject || !tenantId || !Array.isArray(scope.applicationIds)) return [];
      const applicationIds = Array.from(
        new Set(
          scope.applicationIds
            .filter((id): id is string => typeof id === 'string')
            .map(id => id.trim())
            .filter(Boolean)
        )
      ).slice(0, maxApplicationsPerScope);
      return applicationIds.length ? [{ subject, tenantId, applicationIds }] : [];
    })
    .slice(0, maxScopes);
}

export function recentApplicationIDs(scopes: RecentApplicationScope[], subject: string, tenantId: string): string[] {
  return scopes.find(scope => scope.subject === subject && scope.tenantId === tenantId)?.applicationIds ?? [];
}

export function recordRecentApplication(
  scopes: RecentApplicationScope[],
  visit: RecentApplicationVisit
): RecentApplicationScope[] {
  const normalized = {
    subject: visit.subject.trim(),
    tenantId: visit.tenantId.trim(),
    applicationId: visit.applicationId.trim()
  };
  if (!normalized.subject || !normalized.tenantId || !normalized.applicationId) return scopes;

  const safeScopes = normalizeRecentApplicationScopes(scopes);
  const previous = recentApplicationIDs(safeScopes, normalized.subject, normalized.tenantId);
  const current: RecentApplicationScope = {
    subject: normalized.subject,
    tenantId: normalized.tenantId,
    applicationIds: [normalized.applicationId, ...previous.filter(id => id !== normalized.applicationId)].slice(
      0,
      maxApplicationsPerScope
    )
  };
  return [
    current,
    ...safeScopes.filter(scope => scope.subject !== normalized.subject || scope.tenantId !== normalized.tenantId)
  ].slice(0, maxScopes);
}
