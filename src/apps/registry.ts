import type { Component } from 'vue';
import { defineAsyncComponent } from 'vue';

export interface ApplicationModule {
  code: string;
  name: string;
  pages: readonly string[];
}

const pageLoaders = {
  'platform-admin.applications': () => import('./platform-admin/pages/applications/index.vue'),
  'platform-admin.menus': () => import('./platform-admin/pages/menus/index.vue'),
  'platform-admin.application-grants': () => import('./platform-admin/pages/application-grants/index.vue'),
  'platform-admin.tenants': () => import('./platform-admin/pages/tenants/index.vue'),
  'platform-admin.organization-units': () => import('./platform-admin/pages/organization-units/index.vue'),
  'platform-admin.memberships': () => import('./platform-admin/pages/memberships/index.vue'),
  'platform-admin.invitations': () => import('./platform-admin/pages/invitations/index.vue'),
  'platform-admin.quotas': () => import('./platform-admin/pages/quotas/index.vue'),
  'platform-admin.users': () => import('./platform-admin/pages/users/index.vue'),
  'platform-admin.service-accounts': () => import('./platform-admin/pages/service-accounts/index.vue'),
  'platform-admin.sessions': () => import('./platform-admin/pages/sessions/index.vue'),
  'platform-admin.roles': () => import('./platform-admin/pages/roles/index.vue'),
  'platform-admin.permissions': () => import('./platform-admin/pages/permissions/index.vue'),
  'platform-admin.role-permissions': () => import('./platform-admin/pages/role-permissions/index.vue'),
  'platform-admin.role-bindings': () => import('./platform-admin/pages/role-bindings/index.vue'),
  'platform-admin.groups': () => import('./platform-admin/pages/groups/index.vue'),
  'platform-admin.group-members': () => import('./platform-admin/pages/group-members/index.vue'),
  'audit-center.records': () => import('./audit-center/pages/records/index.vue'),
  'config-center.entries': () => import('./config-center/pages/entries/index.vue'),
  'notification-center.templates': () => import('./notification-center/pages/templates/index.vue'),
  'notification-center.deliveries': () => import('./notification-center/pages/deliveries/index.vue'),
  'file-center.files': () => import('./file-center/pages/files/index.vue'),
  'scheduler-center.jobs': () => import('./scheduler-center/pages/jobs/index.vue'),
  'dictionary-center.definitions': () => import('./dictionary-center/pages/definitions/index.vue'),
  'dictionary-center.providers': () => import('./dictionary-center/pages/providers/index.vue'),
  'registry-center.services': () => import('./registry-center/pages/services/index.vue')
} as const;

export type ApplicationPageKey = keyof typeof pageLoaders;

export const applicationPageOptions = Object.freeze(Object.keys(pageLoaders).map(value => ({ value, label: value })));

export const applicationModules: readonly ApplicationModule[] = [
  {
    code: 'platform-admin',
    name: '平台管理',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('platform-admin.')))
  },
  {
    code: 'audit-center',
    name: '审计中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('audit-center.')))
  },
  {
    code: 'config-center',
    name: '配置中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('config-center.')))
  },
  {
    code: 'notification-center',
    name: '通知中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('notification-center.')))
  },
  {
    code: 'file-center',
    name: '文件中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('file-center.')))
  },
  {
    code: 'scheduler-center',
    name: '调度中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('scheduler-center.')))
  },
  {
    code: 'dictionary-center',
    name: '数据字典',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('dictionary-center.')))
  },
  {
    code: 'registry-center',
    name: '服务注册中心',
    pages: Object.freeze(Object.keys(pageLoaders).filter(key => key.startsWith('registry-center.')))
  }
];

const pageComponents = new Map<string, Component>();

export function resolveApplicationPage(pageKey?: string): Component | undefined {
  if (!pageKey || !(pageKey in pageLoaders)) return undefined;

  let component = pageComponents.get(pageKey);
  if (!component) {
    component = defineAsyncComponent(pageLoaders[pageKey as ApplicationPageKey]);
    pageComponents.set(pageKey, component);
  }
  return component;
}

export function isApplicationPageKey(pageKey: string): pageKey is ApplicationPageKey {
  return pageKey in pageLoaders;
}
