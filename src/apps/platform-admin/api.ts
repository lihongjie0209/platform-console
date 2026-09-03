import type { components as ApplicationContract } from '@/service/contracts/generated/application';
import type { components as AuthorizationContract } from '@/service/contracts/generated/authorization';
import type { components as IdentityContract } from '@/service/contracts/generated/identity';
import type { components as TenantContract } from '@/service/contracts/generated/tenant';
import { platformRequest } from '@/service/request';
import type { ApplicationCategory } from '../types';
import { applicationMetadata, parseJSONRecord } from './metadata';

export type Application = ApplicationContract['schemas']['httptransport.ApplicationBody'] & Record<string, unknown>;
export type ApplicationMenu = ApplicationContract['schemas']['httptransport.MenuBody'] & Record<string, unknown>;
export type MenuRelease = ApplicationContract['schemas']['httptransport.MenuReleaseBody'] & Record<string, unknown>;
export type ApplicationGrant = ApplicationContract['schemas']['httptransport.GrantBody'] & Record<string, unknown>;
export type Group = TenantContract['schemas']['httptransport.GroupBody'] & Record<string, unknown>;
type TenantResponseContract = TenantContract['schemas']['httptransport.TenantBody'];
export type OrganizationUnit = TenantContract['schemas']['httptransport.OrganizationUnitBody'] &
  Record<string, unknown>;
export type Membership = TenantContract['schemas']['httptransport.MembershipBody'] & Record<string, unknown>;
export type Invitation = TenantContract['schemas']['httptransport.InvitationBody'] & Record<string, unknown>;
export type Quota = TenantContract['schemas']['httptransport.QuotaBody'] & Record<string, unknown>;
export type GroupMember = TenantContract['schemas']['httptransport.GroupMemberBody'] & Record<string, unknown>;
export type CreateInvitationResult = TenantContract['schemas']['httptransport.CreateInvitationResponseBody'];
type RoleContract = AuthorizationContract['schemas']['httptransport.RoleBody'];
type PermissionContract = AuthorizationContract['schemas']['httptransport.PermissionBody'];
type RolePermissionContract = AuthorizationContract['schemas']['httptransport.RolePermissionBody'];
export type Binding = AuthorizationContract['schemas']['httptransport.BindingBody'] & Record<string, unknown>;
export type ServiceAccountContract = IdentityContract['schemas']['httptransport.ServiceAccountResponseBody'];
export type CreateServiceAccountResult = IdentityContract['schemas']['httptransport.CreateServiceAccountResponseBody'];
export type RotateServiceAccountSecretResult =
  IdentityContract['schemas']['httptransport.RotateServiceAccountSecretResponseBody'];
export type SessionContract = IdentityContract['schemas']['httptransport.SessionResponseBody'];
type IdentityResponseContract = IdentityContract['schemas']['httptransport.IdentityResponseBody'];

export interface Role extends RoleContract, Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  description: string;
  data_scope: string;
  status: string;
  version: number;
}

export interface Permission extends PermissionContract, Record<string, unknown> {
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

export interface RolePermission extends RolePermissionContract, Record<string, unknown> {
  id: string;
  role_id: string;
  permission_id: string;
  status: string;
  version: number;
}

export interface UserIdentity extends IdentityResponseContract, Record<string, unknown> {
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

export interface UpdateUserProfileInput {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  reason: string;
  version: number;
}

export interface AdminMFAStatus {
  available: boolean;
  enabled: boolean;
  status: string;
  recovery_codes_remaining: number;
  version: number;
  enabled_at?: string;
}

export interface AdminMFAResetResult {
  user_id: string;
  reset: boolean;
  revoked_sessions: number;
  version: number;
}

export interface PasswordResetIssue {
  reset_token: string;
  expires_at: string;
}

export interface ServiceAccount extends ServiceAccountContract, Record<string, unknown> {
  id: string;
  client_id: string;
  name: string;
  status: string;
  audiences: string[];
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceAccountForm {
  name: string;
  audiences: string[];
}

export interface ServiceAccountQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

export interface UserSession extends SessionContract, Record<string, unknown> {
  session_id: string;
  user_id: string;
  username: string;
  user_display_name: string;
  tenant_id: string;
  membership_id: string;
  status: string;
  expires_at: string;
  last_used_at: string;
  version: number;
}

export interface SessionQuery {
  page: number;
  pageSize: number;
  userID?: string;
  tenantID?: string;
  status?: string;
}

export interface TenantDirectoryItem extends TenantResponseContract, Record<string, unknown> {
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

export interface GroupQuery {
  tenantID: string;
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
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

export interface BindingForm {
  subject_type: string;
  subject_id: string;
  role_id: string;
  organization_unit_id: string;
}

export interface BindingQuery {
  tenantID: string;
  subjectID?: string;
  subjectType?: string;
  page: number;
  pageSize: number;
}

export interface ScopedBindingQuery extends BindingQuery {
  permissionScope: 'tenant' | 'platform';
}

export interface ScopedBindingRequest {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  form: BindingForm;
}

export interface ScopedRolePermissionRequest {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  roleID: string;
  permissionID: string;
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
  category: ApplicationCategory;
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
        metadata_json: applicationMetadata(form.metadata_json, form.category)
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
        metadata_json: applicationMetadata(form.metadata_json, form.category),
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

export function batchGetUsers(userIDs: string[]) {
  return unwrap<{ items: UserIdentity[] }>(
    identityRequest({
      url: '/api/v1/identities/batch-get',
      method: 'post',
      data: { user_ids: userIDs }
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

export function updateUserProfile(input: UpdateUserProfileInput) {
  return unwrap<UserIdentity>(
    identityRequest({
      url: '/api/v1/identities/update-profile',
      method: 'post',
      data: {
        id: input.id,
        display_name: input.displayName,
        email: input.email,
        phone: input.phone,
        reason: input.reason,
        version: input.version
      }
    })
  );
}

export function getUserMFAStatus(userID: string) {
  return unwrap<AdminMFAStatus>(
    identityRequest({
      url: '/api/v1/identities/mfa/status',
      method: 'post',
      data: { user_id: userID }
    })
  );
}

export function resetUserMFA(userID: string, reason: string, version: number) {
  return unwrap<AdminMFAResetResult>(
    identityRequest({
      url: '/api/v1/identities/mfa/reset',
      method: 'post',
      data: { user_id: userID, reason, version }
    })
  );
}

export function issueUserPasswordReset(userID: string, reason: string) {
  return unwrap<PasswordResetIssue>(
    identityRequest({
      url: '/api/v1/identities/password-reset/issue',
      method: 'post',
      data: { user_id: userID, reason }
    })
  );
}

export function listServiceAccounts(query: ServiceAccountQuery) {
  return unwrap(
    identityRequest<ResourcePage<ServiceAccount>>({
      url: '/api/v1/service-accounts/list',
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

export function createServiceAccount(form: ServiceAccountForm) {
  return unwrap<CreateServiceAccountResult>(
    identityRequest({
      url: '/api/v1/service-accounts/create',
      method: 'post',
      data: { name: form.name, audiences: form.audiences }
    })
  );
}

export async function updateServiceAccountStatus(id: string, status: string, version: number) {
  await unwrap<{ updated: boolean }>(
    identityRequest({
      url: '/api/v1/service-accounts/update-status',
      method: 'post',
      data: { id, status, version }
    })
  );
}

export function rotateServiceAccountSecret(id: string, version: number) {
  return unwrap<RotateServiceAccountSecretResult>(
    identityRequest({
      url: '/api/v1/service-accounts/rotate-secret',
      method: 'post',
      data: { id, version }
    })
  );
}

export function listSessions(query: SessionQuery) {
  return unwrap(
    identityRequest<ResourcePage<UserSession>>({
      url: '/api/v1/sessions/list',
      method: 'post',
      data: {
        page: query.page,
        page_size: query.pageSize,
        user_id: query.userID || '',
        tenant_id: query.tenantID || '',
        status: query.status || ''
      }
    })
  );
}

export function revokeSession(sessionID: string, reason: string, version: number) {
  return unwrap<UserSession>(
    identityRequest({
      url: '/api/v1/sessions/revoke',
      method: 'post',
      data: { session_id: sessionID, reason, version }
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
      url: '/api/v1/tenants/manage/create',
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

export function listTenantApplicationGrants(tenantID: string, page = 1, pageSize = 100) {
  return unwrap<{
    grants: ResourcePage<ApplicationGrant>;
    applications: Application[];
  }>(
    applicationRequest({
      url: '/api/v1/applications/tenant-grants/manage/list',
      method: 'post',
      data: {
        tenant_id: tenantID,
        active_only: false,
        page,
        page_size: pageSize
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

export interface ScopedRoleRequest {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  form: RoleForm;
  roleID?: string;
}
export interface ScopedRoleListQuery {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  page: number;
  pageSize: number;
}

export function listMyRoles(query: ScopedRoleListQuery) {
  return unwrap(
    authorizationRequest<ResourcePage<Role>>({
      url: '/api/v1/authorization/my-roles/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        permission_scope: query.permissionScope,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export async function createMyRole(request: ScopedRoleRequest) {
  await unwrap(
    authorizationRequest<Role>({
      url: '/api/v1/authorization/my-roles/create',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        code: request.form.code,
        name: request.form.name,
        description: request.form.description,
        data_scope: request.form.data_scope
      }
    })
  );
}

export async function updateMyRole(request: ScopedRoleRequest) {
  await unwrap(
    authorizationRequest<Role>({
      url: '/api/v1/authorization/my-roles/update',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        role_id: request.roleID,
        name: request.form.name,
        description: request.form.description,
        data_scope: request.form.data_scope,
        status: request.form.status,
        version: request.form.version
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

export interface PermissionCatalogQuery {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ScopedPermissionRequest {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  form: PermissionForm;
  permissionID?: string;
}

export function listMyPermissionCatalog(query: PermissionCatalogQuery) {
  return unwrap(
    authorizationRequest<ResourcePage<Permission>>({
      url: '/api/v1/authorization/my-permission-catalog/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        permission_scope: query.permissionScope,
        search: query.search || '',
        page: query.page || 1,
        page_size: query.pageSize || 50
      }
    })
  );
}

export function listMyPermissions(query: PermissionCatalogQuery) {
  return unwrap(
    authorizationRequest<ResourcePage<Permission>>({
      url: '/api/v1/authorization/my-permissions/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        permission_scope: query.permissionScope,
        page: query.page || 1,
        page_size: query.pageSize || 20
      }
    })
  );
}

export async function createMyPermission(request: ScopedPermissionRequest) {
  await unwrap(
    authorizationRequest<Permission>({
      url: '/api/v1/authorization/my-permissions/create',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        code: request.form.code,
        name: request.form.name,
        resource_type: request.form.resource_type,
        action: request.form.action,
        condition_expression: request.form.condition_expression
      }
    })
  );
}

export async function updateMyPermission(request: ScopedPermissionRequest) {
  await unwrap(
    authorizationRequest<Permission>({
      url: '/api/v1/authorization/my-permissions/update',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        permission_id: request.permissionID,
        name: request.form.name,
        condition_expression: request.form.condition_expression,
        status: request.form.status,
        version: request.form.version
      }
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

export function listMyRolePermissions(request: Omit<ScopedRolePermissionRequest, 'permissionID'>) {
  return unwrap<{ role_permissions: RolePermission[] }>(
    authorizationRequest({
      url: '/api/v1/authorization/my-role-permissions/list',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        role_id: request.roleID
      }
    })
  );
}

export function grantMyRolePermission(request: ScopedRolePermissionRequest) {
  return unwrap<RolePermission>(
    authorizationRequest({
      url: '/api/v1/authorization/my-role-permissions/grant',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        role_id: request.roleID,
        permission_id: request.permissionID
      }
    })
  );
}

export function revokeMyRolePermission(request: {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  rolePermissionID: string;
  version: number;
}) {
  return unwrap<RolePermission>(
    authorizationRequest({
      url: '/api/v1/authorization/my-role-permissions/revoke',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        role_permission_id: request.rolePermissionID,
        version: request.version
      }
    })
  );
}

export function listBindings(query: BindingQuery) {
  return unwrap<{ items: Binding[]; total: number; page: number; page_size: number }>(
    authorizationRequest({
      url: '/api/v1/authorization/bindings/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        subject_id: query.subjectID || '',
        subject_type: query.subjectType || '',
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function createBinding(tenantID: string, form: BindingForm) {
  return unwrap<Binding>(
    authorizationRequest({
      url: '/api/v1/authorization/bindings/create',
      method: 'post',
      data: {
        tenant_id: tenantID,
        subject_id: form.subject_id,
        subject_type: form.subject_type,
        role_id: form.role_id,
        organization_unit_id: form.organization_unit_id
      }
    })
  );
}

export function revokeBinding(id: string, version: number) {
  return unwrap<Binding>(
    authorizationRequest({
      url: '/api/v1/authorization/bindings/revoke',
      method: 'post',
      data: { binding_id: id, version }
    })
  );
}

export function listMyBindings(query: ScopedBindingQuery) {
  return unwrap<{ items: Binding[]; total: number; page: number; page_size: number }>(
    authorizationRequest({
      url: '/api/v1/authorization/my-bindings/list',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        permission_scope: query.permissionScope,
        subject_id: query.subjectID || '',
        subject_type: query.subjectType || '',
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function createMyBinding(request: ScopedBindingRequest) {
  return unwrap<Binding>(
    authorizationRequest({
      url: '/api/v1/authorization/my-bindings/create',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        subject_id: request.form.subject_id,
        subject_type: request.form.subject_type,
        role_id: request.form.role_id,
        organization_unit_id: request.form.organization_unit_id
      }
    })
  );
}

export function revokeMyBinding(request: {
  tenantID: string;
  permissionScope: 'tenant' | 'platform';
  bindingID: string;
  version: number;
}) {
  return unwrap<Binding>(
    authorizationRequest({
      url: '/api/v1/authorization/my-bindings/revoke',
      method: 'post',
      data: {
        tenant_id: request.tenantID,
        permission_scope: request.permissionScope,
        binding_id: request.bindingID,
        version: request.version
      }
    })
  );
}

export async function listGroups(query: GroupQuery): Promise<ResourcePage<Group>> {
  const data = await unwrap<{ groups: Group[]; total: number; page: number; page_size: number }>(
    tenantRequest({
      url: '/api/v1/groups/search',
      method: 'post',
      data: {
        tenant_id: query.tenantID,
        keyword: query.keyword || '',
        status: query.status || '',
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
  return {
    items: data.groups,
    total: data.total,
    page: data.page,
    page_size: data.page_size
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

export function listGroupMembers(groupID: string) {
  return unwrap<{ group_members: GroupMember[] }>(
    tenantRequest({ url: '/api/v1/groups/members/list', method: 'post', data: { group_id: groupID } })
  );
}

export async function addGroupMember(groupID: string, membershipID: string) {
  await unwrap<{ added: boolean }>(
    tenantRequest({
      url: '/api/v1/groups/member-add',
      method: 'post',
      data: { group_id: groupID, membership_id: membershipID }
    })
  );
}

export async function removeGroupMember(groupID: string, membershipID: string, version: number) {
  await unwrap<{ removed: boolean }>(
    tenantRequest({
      url: '/api/v1/groups/member-remove',
      method: 'post',
      data: { group_id: groupID, membership_id: membershipID, version }
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

export function batchGetMemberships(tenantID: string, membershipIDs: string[]) {
  return unwrap<{ memberships: Membership[] }>(
    tenantRequest({
      url: '/api/v1/memberships/batch-get',
      method: 'post',
      data: { tenant_id: tenantID, membership_ids: membershipIDs }
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
