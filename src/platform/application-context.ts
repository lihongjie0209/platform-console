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
