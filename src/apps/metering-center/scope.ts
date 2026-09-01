export interface UsageApplicationScope {
  tenant_id: string;
  application_id: string;
}

export function usageApplicationScope(tenantID: string, applicationID: string): UsageApplicationScope {
  if (!tenantID.trim() || !applicationID.trim()) {
    throw new Error('usage tenant and application scope are required');
  }
  return { tenant_id: tenantID, application_id: applicationID };
}
