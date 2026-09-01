export interface RuleApplicationScope {
  tenant_id: string;
  application_id: string;
}

export function ruleApplicationScope(tenantID: string, applicationID: string): RuleApplicationScope {
  if (!tenantID || !applicationID) throw new Error('rule tenant and application scope are required');
  return { tenant_id: tenantID, application_id: applicationID };
}
