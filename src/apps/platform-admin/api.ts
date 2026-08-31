import type { components as ApplicationContract } from '@/service/contracts/generated/application';
import type { components as TenantContract } from '@/service/contracts/generated/tenant';
import { platformRequest } from '@/service/request';
import { parseJSONObject, parseJSONRecord } from './metadata';

export type Application = ApplicationContract['schemas']['application.Application'] & Record<string, unknown>;
export type ApplicationMenu = ApplicationContract['schemas']['application.Menu'] & Record<string, unknown>;
export type MenuRelease = ApplicationContract['schemas']['application.MenuRelease'] & Record<string, unknown>;
export type ApplicationGrant = ApplicationContract['schemas']['application.Grant'] & Record<string, unknown>;
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

export interface RoleForm extends Record<string, unknown> {
  code: string;
  name: string;
  description: string;
  data_scope: string;
  status: string;
  version: number;
}

export interface PermissionForm extends Record<string, unknown> {
  code: string;
  name: string;
  resource_type: string;
  action: string;
  condition_expression: string;
  status: string;
  version: number;
}

export interface RolePermission extends Record<string, unknown> {
  id: string;
  role_id: string;
  permission_id: string;
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

export interface TenantDirectoryItem extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
}

export interface ApplicationGrantForm {
  source: string;
  valid_from: string;
  valid_until: string;
  entitlements_json: string;
}

export interface TenantDirectoryQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

export interface GrantApplicationInput {
  tenantID: string;
  applicationID: string;
  form: ApplicationGrantForm;
  version: number;
}

export interface ResourcePage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApplicationForm extends Record<string, unknown> {
  code: string;
  name: string;
  description: string;
  icon: string;
  default_route: string;
  sort_order: number;
  status: string;
  metadata_json: string;
  version: number;
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

export function listApplications(page: number, pageSize: number, status = '') {
  return unwrap(
    applicationRequest<ResourcePage<Application>>({
      url: '/api/v1/applications/list',
      method: 'post',
      data: { page, page_size: pageSize, status }
    })
  );
}

export function getApplication(id: string) {
  return unwrap(
    applicationRequest<Application>({
      url: '/api/v1/applications/get',
      method: 'post',
      data: { id }
    })
  );
}

export async function createApplication(form: ApplicationForm) {
  await unwrap(
    applicationRequest<Application>({
      url: '/api/v1/applications/create',
      method: 'post',
      data: {
        code: form.code,
        name: form.name,
        description: form.description,
        icon: form.icon,
        default_route: form.default_route,
        sort_order: form.sort_order,
        metadata_json: parseJSONObject(form.metadata_json)
      }
    })
  );
}

export async function updateApplication(id: string, form: ApplicationForm) {
  await unwrap(
    applicationRequest<Application>({
      url: '/api/v1/applications/update',
      method: 'post',
      data: {
        id,
        name: form.name,
        description: form.description,
        icon: form.icon,
        default_route: form.default_route,
        sort_order: form.sort_order,
        status: form.status,
        metadata_json: parseJSONObject(form.metadata_json),
        version: form.version
      }
    })
  );
}

export function listMenuDraft(applicationID: string) {
  return unwrap(
    applicationRequest<ApplicationMenu[]>({
      url: '/api/v1/applications/menus/draft/list',
      method: 'post',
      data: { application_id: applicationID }
    })
  );
}

export function upsertMenu(menu: ApplicationMenu, expectedVersion: number) {
  return unwrap(
    applicationRequest<ApplicationMenu>({
      url: '/api/v1/applications/menus/upsert',
      method: 'post',
      data: { menu, expected_version: expectedVersion }
    })
  );
}

export async function deleteMenu(id: string, version: number) {
  await unwrap(
    applicationRequest<Record<string, never>>({
      url: '/api/v1/applications/menus/delete',
      method: 'post',
      data: { id, version }
    })
  );
}

export function publishMenus(applicationID: string, applicationVersion: number, comment: string) {
  return unwrap<{ release: MenuRelease; menus: ApplicationMenu[] }>(
    applicationRequest({
      url: '/api/v1/applications/menus/publish',
      method: 'post',
      data: {
        application_id: applicationID,
        application_version: applicationVersion,
        comment
      }
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

export function listTenantDirectory(query: TenantDirectoryQuery) {
  return unwrap(
    tenantRequest<ResourcePage<TenantDirectoryItem>>({
      url: '/api/v1/tenants/list',
      method: 'post',
      data: {
        page: query.page,
        page_size: query.pageSize,
        keyword: query.keyword || '',
        status: query.status || ''
      }
    })
  );
}

export function listTenantApplicationGrants(tenantID: string) {
  return unwrap<{
    grants: ResourcePage<ApplicationGrant>;
    applications: Application[];
  }>(
    applicationRequest({
      url: '/api/v1/applications/tenant-grants/list',
      method: 'post',
      data: {
        tenant_id: tenantID,
        active_only: false,
        page: 1,
        page_size: 100
      }
    })
  );
}

export function grantApplication(input: GrantApplicationInput) {
  const data: Record<string, unknown> = {
    tenant_id: input.tenantID,
    application_id: input.applicationID,
    source: input.form.source,
    entitlements_json: parseJSONRecord(input.form.entitlements_json, 'entitlements_json'),
    expected_version: input.version
  };
  if (input.form.valid_from) data.valid_from = input.form.valid_from;
  if (input.form.valid_until) data.valid_until = input.form.valid_until;
  return unwrap<ApplicationGrant>(
    applicationRequest({
      url: '/api/v1/applications/tenant-grants/grant',
      method: 'post',
      data
    })
  );
}

export function revokeApplicationGrant(tenantID: string, applicationID: string, version: number) {
  return unwrap<ApplicationGrant>(
    applicationRequest({
      url: '/api/v1/applications/tenant-grants/revoke',
      method: 'post',
      data: { tenant_id: tenantID, application_id: applicationID, version }
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

export async function createRole(tenantID: string, form: RoleForm) {
  await unwrap(
    authorizationRequest<Role>({
      url: '/api/v1/authorization/roles/create',
      method: 'post',
      data: {
        tenant_id: tenantID,
        code: form.code,
        name: form.name,
        description: form.description,
        data_scope: form.data_scope
      }
    })
  );
}

export async function updateRole(id: string, form: RoleForm) {
  await unwrap(
    authorizationRequest<Role>({
      url: '/api/v1/authorization/roles/update',
      method: 'post',
      data: {
        role_id: id,
        name: form.name,
        description: form.description,
        data_scope: form.data_scope,
        status: form.status,
        version: form.version
      }
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

export async function createPermission(tenantID: string, form: PermissionForm) {
  await unwrap(
    authorizationRequest<Permission>({
      url: '/api/v1/authorization/permissions/create',
      method: 'post',
      data: {
        tenant_id: tenantID,
        code: form.code,
        name: form.name,
        resource_type: form.resource_type,
        action: form.action,
        condition_expression: form.condition_expression
      }
    })
  );
}

export async function updatePermission(id: string, form: PermissionForm) {
  await unwrap(
    authorizationRequest<Permission>({
      url: '/api/v1/authorization/permissions/update',
      method: 'post',
      data: {
        permission_id: id,
        name: form.name,
        condition_expression: form.condition_expression,
        status: form.status,
        version: form.version
      }
    })
  );
}

export function listRolePermissions(roleID: string) {
  return unwrap<{ role_permissions: RolePermission[] }>(
    authorizationRequest({
      url: '/api/v1/authorization/role-permissions/list',
      method: 'post',
      data: { role_id: roleID }
    })
  );
}

export function grantRolePermission(tenantID: string, roleID: string, permissionID: string) {
  return unwrap<RolePermission>(
    authorizationRequest({
      url: '/api/v1/authorization/role-permissions/grant',
      method: 'post',
      data: {
        tenant_id: tenantID,
        role_id: roleID,
        permission_id: permissionID
      }
    })
  );
}

export function revokeRolePermission(rolePermissionID: string, version: number) {
  return unwrap<RolePermission>(
    authorizationRequest({
      url: '/api/v1/authorization/role-permissions/revoke',
      method: 'post',
      data: { role_permission_id: rolePermissionID, version }
    })
  );
}

export async function listGroups(tenantID: string, page: number, pageSize: number): Promise<ResourcePage<Group>> {
  const data = await unwrap<{ groups: Group[] }>(
    tenantRequest<{ groups: Group[] }>({
      url: '/api/v1/groups/list',
      method: 'post',
      data: { tenant_id: tenantID }
    })
  );
  const start = (page - 1) * pageSize;
  return {
    items: data.groups.slice(start, start + pageSize),
    total: data.groups.length,
    page,
    page_size: pageSize
  };
}
