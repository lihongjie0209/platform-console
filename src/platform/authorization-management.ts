export type AuthorizationManagementScope = 'tenant' | 'platform';

export const authorizationManagementScopeOptions: Array<{ label: string; value: AuthorizationManagementScope }> = [
  { label: '租户作用域', value: 'tenant' },
  { label: '平台作用域', value: 'platform' }
];

export function authorizationManagementContextKey(tenantID: string, scope: AuthorizationManagementScope) {
  return `${tenantID.trim()}:${scope}`;
}
