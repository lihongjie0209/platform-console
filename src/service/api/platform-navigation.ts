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
  sort_order: number;
  visible: boolean;
  status: string;
}

export interface PublishedNavigation {
  application: PlatformApplication;
  menus: ApplicationMenu[];
}

interface TenantApplications {
  applications: PlatformApplication[];
}

const tenantRequest = platformRequest('tenant');
const applicationRequest = platformRequest('application');

export function fetchUserTenants(userID: string) {
  return tenantRequest<Page<TenantSummary>>({
    url: '/api/v1/tenants/list-by-user',
    method: 'post',
    data: { user_id: userID, page: 1, page_size: 100 }
  });
}

export function fetchTenantApplications(tenantID: string) {
  return applicationRequest<TenantApplications>({
    url: '/api/v1/applications/tenant-grants/list',
    method: 'post',
    data: { tenant_id: tenantID, active_only: true, page: 1, page_size: 100 }
  });
}

export function fetchPublishedNavigation(applicationID: string) {
  return applicationRequest<PublishedNavigation>({
    url: '/api/v1/applications/navigation/get',
    method: 'post',
    data: { application_id: applicationID }
  });
}
