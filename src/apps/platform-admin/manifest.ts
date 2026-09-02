import type { ApplicationManifest } from '../types';

export const platformAdminManifest = {
  code: 'platform-admin',
  name: '平台管理',
  category: 'platform',
  pages: {
    'platform-admin.applications': () => import('./pages/applications/index.vue'),
    'platform-admin.menus': () => import('./pages/menus/index.vue'),
    'platform-admin.application-grants': () => import('./pages/application-grants/index.vue'),
    'platform-admin.tenants': () => import('./pages/tenants/index.vue'),
    'platform-admin.organization-units': () => import('./pages/organization-units/index.vue'),
    'platform-admin.memberships': () => import('./pages/memberships/index.vue'),
    'platform-admin.invitations': () => import('./pages/invitations/index.vue'),
    'platform-admin.quotas': () => import('./pages/quotas/index.vue'),
    'platform-admin.users': () => import('./pages/users/index.vue'),
    'platform-admin.service-accounts': () => import('./pages/service-accounts/index.vue'),
    'platform-admin.sessions': () => import('./pages/sessions/index.vue'),
    'platform-admin.roles': () => import('./pages/roles/index.vue'),
    'platform-admin.permissions': () => import('./pages/permissions/index.vue'),
    'platform-admin.role-permissions': () => import('./pages/role-permissions/index.vue'),
    'platform-admin.role-bindings': () => import('./pages/role-bindings/index.vue'),
    'platform-admin.groups': () => import('./pages/groups/index.vue'),
    'platform-admin.group-members': () => import('./pages/group-members/index.vue')
  }
} satisfies ApplicationManifest;
