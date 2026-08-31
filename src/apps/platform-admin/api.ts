import type { components as ApplicationContract } from '@/service/contracts/generated/application';
import type { components as TenantContract } from '@/service/contracts/generated/tenant';
import { platformRequest } from '@/service/request';
import { parseJSONObject, parseJSONRecord } from './metadata';

export type Application = ApplicationContract['schemas']['application.Application'] & Record<string, unknown>;
export type ApplicationMenu = ApplicationContract['schemas']['application.Menu'] & Record<string, unknown>;
export type MenuRelease = ApplicationContract['schemas']['application.MenuRelease'] & Record<string, unknown>;
export type ApplicationGrant = ApplicationContract['schemas']['application.Grant'] & Record<string, unknown>;
export type Group = TenantContract['schemas']['tenant.Group'] & Record<string, unknown>;
export type OrganizationUnit = TenantContract['schemas']['tenant.OrganizationUnit'] & Record<string, unknown>;
export type Membership = TenantContract['schemas']['tenant.Membership'] & Record<string, unknown>;
export type Invitation = TenantContract['schemas']['tenant.Invitation'] & Record<string, unknown>;
export type Quota = TenantContract['schemas']['tenant.Quota'] & Record<string, unknown>;
export type CreateInvitationResult = TenantContract['schemas']['httptransport.CreateInvitationResponseBody'];

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

export interface UserForm extends Record<string, unknown> {
  username: string;
  display_name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
  reason: string;
  version: number;
}

export interface TenantDirectoryItem extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
}

export interface TenantForm extends Record<string, unknown> {
  code: string;
  name: string;
  owner_user_id: string;
  status: string;
  version: number;
}

export interface GroupForm extends Record<string, unknown> {
  code: string;
  name: string;
  status: string;
  version: number;
}

export interface OrganizationUnitForm {
  id: string;
  parent_id: string;
  code: string;
  name: string;
  status: string;
  version: number;
}

export interface MembershipForm extends Record<string, unknown> {
  user_id: string;
  primary_organization_unit_id: string;
  status: string;
  reason: string;
  version: number;
}

export interface MembershipQuery {
  tenantID: string;
  userID?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface InvitationForm {
  email: string;
  expires_in_hours: number;
}

export interface QuotaForm extends Record<string, unknown> {
  key: string;
  limit: number;
  version: number;
}

export interface QuotaQuery {
  tenantID: string;
  keyword?: string;
  page: number;
  pageSize: number;
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

export interface UserQuery {
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

export function listUsers(query: UserQuery) {
  return unwrap(
    identityRequest<ResourcePage<UserIdentity>>({
      url: '/api/v1/identities/list',
      method: 'post',
      data: { page: query.page, page_size: query.pageSize, keyword: query.keyword || '', status: query.status || '' }
    })
  );
}

export async function createUser(form: UserForm) {
  await unwrap<UserIdentity>(
    identityRequest({
      url: '/api/v1/identities/register',
      method: 'post',
      data: {
        username: form.username,
        display_name: form.display_name,
        email: form.email,
        phone: form.phone,
        password: form.password
      }
    })
  );
}

export async function updateUserStatus(id: string, form: UserForm) {
  await unwrap<UserIdentity>(
    identityRequest({
      url: '/api/v1/identities/update-status',
      method: 'post',
      data: { id, status: form.status, reason: form.reason, version: form.version }
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

export function getTenant(tenantID: string) {
  return unwrap<TenantDirectoryItem>(
    tenantRequest({ url: '/api/v1/tenants/get', method: 'post', data: { tenant_id: tenantID } })
  );
}

export async function createTenant(form: TenantForm) {
  await unwrap<{ tenant: TenantDirectoryItem }>(
    tenantRequest({
      url: '/api/v1/tenants/create',
      method: 'post',
      data: { code: form.code, name: form.name, owner_user_id: form.owner_user_id }
    })
  );
}

export async function updateTenant(id: string, form: TenantForm) {
  await unwrap<TenantDirectoryItem>(
    tenantRequest({
      url: '/api/v1/tenants/update',
      method: 'post',
      data: { tenant_id: id, name: form.name, status: form.status, version: form.version }
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

export async function createGroup(tenantID: string, form: GroupForm) {
  await unwrap<Group>(
    tenantRequest({
      url: '/api/v1/groups/create',
      method: 'post',
      data: { tenant_id: tenantID, code: form.code, name: form.name }
    })
  );
}

export async function updateGroup(id: string, form: GroupForm) {
  await unwrap<Group>(
    tenantRequest({
      url: '/api/v1/groups/update',
      method: 'post',
      data: { group_id: id, name: form.name, status: form.status, version: form.version }
    })
  );
}

export function listOrganizationUnits(tenantID: string) {
  return unwrap<{ organization_units: OrganizationUnit[] }>(
    tenantRequest({ url: '/api/v1/organization-units/list', method: 'post', data: { tenant_id: tenantID } })
  ).then(result => result.organization_units || []);
}

export function createOrganizationUnit(tenantID: string, form: OrganizationUnitForm) {
  return unwrap<OrganizationUnit>(
    tenantRequest({
      url: '/api/v1/organization-units/create',
      method: 'post',
      data: { tenant_id: tenantID, parent_id: form.parent_id, code: form.code, name: form.name }
    })
  );
}

export function updateOrganizationUnit(form: OrganizationUnitForm) {
  return unwrap<OrganizationUnit>(
    tenantRequest({
      url: '/api/v1/organization-units/update',
      method: 'post',
      data: {
        organization_unit_id: form.id,
        parent_id: form.parent_id,
        name: form.name,
        status: form.status,
        version: form.version
      }
    })
  );
}

export function listMemberships(query: MembershipQuery) {
  return unwrap<{ memberships: Membership[]; total: number; page: number; page_size: number }>(
    tenantRequest({
      url: '/api/v1/memberships/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        user_id: query.userID || '',
        status: query.status || '',
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export async function addMembership(tenantID: string, form: MembershipForm) {
  await unwrap<Membership>(
    tenantRequest({
      url: '/api/v1/memberships/add',
      method: 'post',
      data: {
        tenant_id: tenantID,
        user_id: form.user_id,
        primary_organization_unit_id: form.primary_organization_unit_id
      }
    })
  );
}

export async function updateMembership(id: string, form: MembershipForm) {
  await unwrap<Membership>(
    tenantRequest({
      url: '/api/v1/memberships/update',
      method: 'post',
      data: {
        membership_id: id,
        status: form.status,
        primary_organization_unit_id: form.primary_organization_unit_id,
        version: form.version,
        reason: form.reason
      }
    })
  );
}

export function listInvitations(tenantID: string, page: number, pageSize: number) {
  return unwrap<{ invitations: Invitation[]; total: number; page: number; page_size: number }>(
    tenantRequest({
      url: '/api/v1/invitations/list',
      method: 'post',
      data: { tenant_id: tenantID, page, page_size: pageSize }
    })
  );
}

export function createInvitation(tenantID: string, form: InvitationForm) {
  return unwrap<CreateInvitationResult>(
    tenantRequest({
      url: '/api/v1/invitations/create',
      method: 'post',
      data: { tenant_id: tenantID, email: form.email, expires_in_seconds: form.expires_in_hours * 60 * 60 }
    })
  );
}

export function revokeInvitation(id: string, version: number) {
  return unwrap<Invitation>(
    tenantRequest({
      url: '/api/v1/invitations/revoke',
      method: 'post',
      data: { invitation_id: id, version }
    })
  );
}

export function listQuotas(query: QuotaQuery) {
  return unwrap<{ quotas: Quota[]; total: number; page: number; page_size: number }>(
    tenantRequest({
      url: '/api/v1/quotas/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        keyword: query.keyword || '',
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export async function setQuota(tenantID: string, form: QuotaForm) {
  await unwrap<Quota>(
    tenantRequest({
      url: '/api/v1/quotas/set',
      method: 'post',
      data: { tenant_id: tenantID, key: form.key, limit: form.limit, version: form.version }
    })
  );
}
