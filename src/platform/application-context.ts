import type { PlatformApplication, PublishedNavigation, TenantSummary } from '@/service/api/platform-navigation';

export function selectActiveTenant(tenants: TenantSummary[], preferredTenantId: string) {
  const active = tenants.filter(item => item.status === 'active');
  return active.find(item => item.id === preferredTenantId) || active[0];
}

export function retainActiveNavigations(applications: PlatformApplication[], navigations: PublishedNavigation[]) {
  const activeApplicationIds = new Set(applications.filter(item => item.status === 'active').map(item => item.id));
  return navigations.filter(item => activeApplicationIds.has(item.application.id));
}

export function filterApplications(applications: PlatformApplication[], keyword: string) {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return applications;

  return applications.filter(application =>
    [application.name, application.code, application.description].some(text =>
      text.toLocaleLowerCase().includes(normalized)
    )
  );
}

export function hasApplicationScope(tenantId: string, applicationId: string) {
  return Boolean(tenantId.trim() && applicationId.trim());
}

export function applicationScope(tenantId: string, applicationId: string) {
  if (!hasApplicationScope(tenantId, applicationId)) {
    throw new Error('tenant and application scope are required');
  }
  return { tenant_id: tenantId, application_id: applicationId };
}

export function applicationFilterScope(tenantId: string, applicationId: string) {
  const scope = applicationScope(tenantId, applicationId);
  return { tenant_id: scope.tenant_id, application_ids: [scope.application_id] };
}

interface PlatformContextReuseInput {
  initializedSubject: string;
  requestedSubject: string;
  tenantCount: number;
  force: boolean;
}

export function shouldReusePlatformContext(input: PlatformContextReuseInput) {
  return !input.force && input.initializedSubject === input.requestedSubject && input.tenantCount > 0;
}

/** Serializes scope-changing operations so the access token and server-side session end in the same tenant. */
export function createSerialTaskQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const operation = tail.catch(() => undefined).then(task);
    tail = operation.catch(() => undefined);
    return operation;
  };
}

export function createLatestRequestGuard() {
  let revision = 0;
  return {
    begin() {
      revision += 1;
      return revision;
    },
    isCurrent(value: number) {
      return value === revision;
    },
    invalidate() {
      revision += 1;
    }
  };
}

export interface FailedTenantSelectionContext {
  tenantId: string;
  applicationId: string;
  clearResources: boolean;
}

interface FailedTenantSelectionInput {
  scopeExchanged: boolean;
  previousTenantId: string;
  previousApplicationId: string;
  requestedTenantId: string;
}

/**
 * Once the server session has exchanged tenant scope, retaining the previous
 * tenant's applications would mix trusted token scope with stale UI resources.
 */
export function failedTenantSelectionContext({
  scopeExchanged,
  previousTenantId,
  previousApplicationId,
  requestedTenantId
}: FailedTenantSelectionInput): FailedTenantSelectionContext {
  if (!scopeExchanged) {
    return { tenantId: previousTenantId, applicationId: previousApplicationId, clearResources: false };
  }
  return { tenantId: requestedTenantId, applicationId: '', clearResources: true };
}
