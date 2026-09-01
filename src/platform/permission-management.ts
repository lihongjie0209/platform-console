export type PermissionManagementScope = 'tenant' | 'platform';

export const permissionManagementScopeOptions: Array<{ label: string; value: PermissionManagementScope }> = [
  { label: '租户权限', value: 'tenant' },
  { label: '平台权限', value: 'platform' }
];

export function permissionManagementContextKey(tenantID: string, scope: PermissionManagementScope) {
  return `${tenantID.trim()}:${scope}`;
}
