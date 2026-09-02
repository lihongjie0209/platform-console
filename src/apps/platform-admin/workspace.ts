import type { ApplicationMenuEntry } from '@/platform/navigation';

export interface GovernanceDomain {
  code: string;
  name: string;
  description: string;
  icon: string;
  menuCodes: readonly string[];
  path: string;
}

const governanceDomains: readonly Omit<GovernanceDomain, 'path'>[] = [
  {
    code: 'identity',
    name: '身份与账号',
    description: '用户、服务账号、会话与认证安全。',
    icon: 'mdi:account-key-outline',
    menuCodes: ['users', 'service-accounts', 'sessions']
  },
  {
    code: 'tenant',
    name: '租户与组织',
    description: '租户、组织架构、成员、邀请与用户组。',
    icon: 'mdi:domain',
    menuCodes: ['tenants', 'organization-units', 'memberships', 'invitations', 'groups']
  },
  {
    code: 'authorization',
    name: '统一授权',
    description: '角色、权限、角色授权与主体绑定。',
    icon: 'mdi:shield-key-outline',
    menuCodes: ['roles', 'permissions', 'role-permissions', 'role-bindings']
  },
  {
    code: 'application',
    name: '应用治理',
    description: '应用目录、菜单发布与租户应用授权。',
    icon: 'mdi:application-cog-outline',
    menuCodes: ['applications', 'menus', 'application-grants']
  }
];

/** Resolves domain entry points only from the caller's published and executable menu set. */
export function governanceDomainEntries(entries: ApplicationMenuEntry[]): GovernanceDomain[] {
  return governanceDomains.map(domain => ({
    ...domain,
    path:
      domain.menuCodes.map(code => entries.find(entry => entry.code === code && entry.available)?.path).find(Boolean) ||
      ''
  }));
}
