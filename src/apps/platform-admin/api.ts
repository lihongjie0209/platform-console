import type { components as ApplicationContract } from '@/service/contracts/generated/application';
import type { components as TenantContract } from '@/service/contracts/generated/tenant';
import { platformRequest } from '@/service/request';

export type Application = ApplicationContract['schemas']['application.Application'] & Record<string, unknown>;
export type Group = TenantContract['schemas']['tenant.Group'] & Record<string, unknown>;

export interface Role extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  description: string;
  data_scope: string;
  status: string;
  version: number;
}

export interface Permission extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  resource_type: string;
  action: string;
  condition_expression: string;
  status: string;
  version: number;
}

export interface UserIdentity extends Record<string, unknown> {
  id: string;
  username: string;
  display_name: string;
  email: string;
  phone: string;
  status: string;
  version: number;
}

export interface ResourcePage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const applicationRequest = platformRequest('application');
const authorizationRequest = platformRequest('authorization');
const tenantRequest = platformRequest('tenant');
const identityRequest = platformRequest('identity');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('service returned an empty response');
  return data;
}

export function listApplications(page: number, pageSize: number) {
  return unwrap(
    applicationRequest<ResourcePage<Application>>({
      url: '/api/v1/applications/list',
      method: 'post',
      data: { page, page_size: pageSize }
    })
  );
}

export function listUsers(_tenantID: string, page: number, pageSize: number) {
  return unwrap(
    identityRequest<ResourcePage<UserIdentity>>({
      url: '/api/v1/identities/list',
      method: 'post',
      data: { page, page_size: pageSize }
    })
  );
}

export function listRoles(tenantID: string, page: number, pageSize: number) {
  return unwrap(
    authorizationRequest<ResourcePage<Role>>({
      url: '/api/v1/authorization/roles/list',
      method: 'post',
      data: { tenant_id: tenantID, page, page_size: pageSize }
    })
  );
}

export function listPermissions(tenantID: string, page: number, pageSize: number) {
  return unwrap(
    authorizationRequest<ResourcePage<Permission>>({
      url: '/api/v1/authorization/permissions/list',
      method: 'post',
      data: { tenant_id: tenantID, page, page_size: pageSize }
    })
  );
}

export async function listGroups(tenantID: string, page: number, pageSize: number): Promise<ResourcePage<Group>> {
  const data = await unwrap<{ groups: Group[] }>(
    tenantRequest<{ groups: Group[] }>({ url: '/api/v1/groups/list', method: 'post', data: { tenant_id: tenantID } })
  );
  const start = (page - 1) * pageSize;
  return {
    items: data.groups.slice(start, start + pageSize),
    total: data.groups.length,
    page,
    page_size: pageSize
  };
}
