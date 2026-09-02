import { platformRequest } from '../request';

export interface TenantSummary {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PlatformApplication {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  default_route: string;
  sort_order?: number;
  status: string;
}

export interface ApplicationMenu {
  id: string;
  application_id: string;
  parent_id: string;
  code: string;
  type: string;
  name: string;
  i18n_key: string;
  route: string;
  component: string;
  icon: string;
  external_url: string;
  permission_code: string;
  permission_scope?: 'tenant' | 'platform' | '';
  sort_order: number;
  visible: boolean;
  status: string;
}

export interface PublishedNavigation {
  application: PlatformApplication;
  menus: ApplicationMenu[];
}

interface TenantApplications {
  grants: Page<unknown>;
  applications: PlatformApplication[];
}

export interface TenantSelectionToken {
  access_token: string;
  token_type: string;
  expires_at: string;
  tenant_id: string;
  membership_id: string;
}

export interface PermissionCodeDecision {
  allowed_codes: string[];
  policy_version: number;
}

const tenantRequest = platformRequest('tenant');
const applicationRequest = platformRequest('application');
const authorizationRequest = platformRequest('authorization');

export function fetchUserTenants(userID: string, page = 1, pageSize = 100) {
  return tenantRequest<Page<TenantSummary>>({
    url: '/api/v1/tenants/list-by-user',
    method: 'post',
    data: { user_id: userID, page, page_size: pageSize }
  });
}

export function fetchTenantApplications(tenantID: string, page = 1, pageSize = 100) {
  return applicationRequest<TenantApplications>({
    url: '/api/v1/applications/tenant-grants/list',
    method: 'post',
    data: { tenant_id: tenantID, active_only: true, page, page_size: pageSize }
  });
}

export function fetchSelectTenant(tenantID: string) {
  return tenantRequest<TenantSelectionToken>({
    url: '/api/v1/tenants/select',
    method: 'post',
    data: { tenant_id: tenantID }
  });
}

export function fetchPublishedNavigation(applicationID: string) {
  return applicationRequest<PublishedNavigation>({
    url: '/api/v1/applications/navigation/get',
    method: 'post',
    data: { application_id: applicationID }
  });
}

export function fetchPublishedNavigations(applicationIDs: string[]) {
  return applicationRequest<{ items: PublishedNavigation[] }>({
    url: '/api/v1/applications/navigation/batch-get',
    method: 'post',
    data: { application_ids: applicationIDs }
  });
}

export function fetchMyPermissionCodes(
  tenantID: string,
  permissionScope: 'tenant' | 'platform',
  permissionCodes: string[]
) {
  return authorizationRequest<PermissionCodeDecision>({
    url: '/api/v1/authorization/my-permissions/check',
    method: 'post',
    data: { tenant_id: tenantID, permission_scope: permissionScope, permission_codes: permissionCodes }
  });
}
