import test from 'node:test';
import assert from 'node:assert/strict';
import type { ApplicationMenu, PlatformApplication } from '@/service/api/platform-navigation';
import {
  activeApplicationRoutes,
  applicationEntryDecision,
  applicationEntryPath,
  applicationEntryStatusLabel,
  applicationEntryStatusMessage,
  applicationMenuEntries,
  applicationMenuSections,
  applicationNavigationCompatibility,
  filterNavigationsByPermissions,
  hasAllowedPermission,
  navigationPermissionCodes,
  navigationToRoutes,
  normalizeMenuPermissionScope,
  preferredApplicationEntryPath,
  retainRunnableApplicationID,
  runnableApplicationIDForPath,
  safeExternalURL
} from './navigation';

function applicationMenu(overrides: Pick<ApplicationMenu, 'id'> & Partial<ApplicationMenu>): ApplicationMenu {
  const { id, ...values } = overrides;
  return {
    id,
    application_id: 'billing-id',
    parent_id: '',
    code: overrides.id,
    type: 'page',
    name: overrides.id,
    i18n_key: '',
    route: overrides.id,
    component: '',
    icon: '',
    external_url: '',
    permission_code: '',
    permission_scope: 'tenant',
    sort_order: 1,
    visible: true,
    status: 'active',
    ...values
  };
}

test('menu permission scope keeps platform explicit and defaults legacy values to tenant', () => {
  assert.equal(normalizeMenuPermissionScope('platform'), 'platform');
  assert.equal(normalizeMenuPermissionScope('tenant'), 'tenant');
  assert.equal(normalizeMenuPermissionScope(undefined), 'tenant');
  assert.equal(normalizeMenuPermissionScope('unknown'), 'tenant');
});

test('button permission checks keep tenant and platform scopes separate', () => {
  const allowed = {
    tenant: ['billing.invoice.read'],
    platform: [' Application.Catalog.Read ', 'application.catalog.update']
  };
  assert.equal(hasAllowedPermission(allowed), true);
  assert.equal(hasAllowedPermission(allowed, { scope: 'platform', codes: 'application.catalog.read' }), true);
  assert.equal(
    hasAllowedPermission(allowed, {
      scope: 'platform',
      codes: ['application.catalog.read', 'application.catalog.update'],
      strategy: 'all'
    }),
    true
  );
  assert.equal(hasAllowedPermission(allowed, { scope: 'tenant', codes: 'application.catalog.read' }), false);
  assert.equal(hasAllowedPermission(allowed, { scope: 'tenant', codes: [] }), false);
});

test('navigationToRoutes scopes routes and mounts only an allowlisted component key', () => {
  const [applicationRoute] = navigationToRoutes({
    application: {
      id: 'app-1',
      code: 'platform-admin',
      name: 'Platform',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      {
        id: 'menu-1',
        application_id: 'app-1',
        parent_id: '',
        code: 'accounts',
        type: 'page',
        name: '账户',
        i18n_key: '',
        route: 'accounts',
        component: 'platform-admin.users',
        icon: '',
        external_url: '',
        permission_code: 'identity.accounts.read',
        sort_order: 1,
        visible: true,
        status: 'active'
      }
    ]
  });

  const [, route] = applicationRoute.children!;
  assert.equal(route.path, '/apps/platform-admin/accounts');
  assert.equal(route.component, 'view.platform_page');
  assert.equal(route.name, 'platform_platform-admin_accounts');
  assert.equal(applicationRoute.meta?.applicationId, 'app-1');
  assert.equal(route.meta?.applicationId, 'app-1');
});

test('navigationToRoutes removes unavailable pages and empty directories', () => {
  const navigation = {
    application: {
      id: 'billing-id',
      code: 'billing-center',
      name: 'Billing',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      applicationMenu({ id: 'installed', component: 'billing-center.plans' }),
      applicationMenu({ id: 'future', component: 'billing-center.future' }),
      applicationMenu({ id: 'empty-directory', type: 'directory', component: '', route: 'empty' }),
      applicationMenu({
        id: 'future-child',
        parent_id: 'empty-directory',
        component: 'billing-center.future-child'
      })
    ]
  };

  const serialized = JSON.stringify(navigationToRoutes(navigation));
  assert.match(serialized, /installed/);
  assert.doesNotMatch(serialized, /future/);
  assert.doesNotMatch(serialized, /empty-directory/);
});

test('permission filtering separates scopes, removes denied descendants and preserves unprotected menus', () => {
  const menu = ({
    id,
    parentID = '',
    permissionCode = '',
    permissionScope = 'tenant'
  }: {
    id: string;
    parentID?: string;
    permissionCode?: string;
    permissionScope?: 'tenant' | 'platform';
  }) => ({
    id,
    application_id: 'app-1',
    parent_id: parentID,
    code: id,
    type: 'page',
    name: id,
    i18n_key: '',
    route: id,
    component: '',
    icon: '',
    external_url: '',
    permission_code: permissionCode,
    permission_scope: permissionScope,
    sort_order: 1,
    visible: true,
    status: 'active'
  });
  const navigation = {
    application: {
      id: 'app-1',
      code: 'orders',
      name: 'Orders',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      menu({ id: 'public' }),
      menu({ id: 'denied-parent', permissionCode: 'orders.admin' }),
      menu({ id: 'hidden-child', parentID: 'denied-parent' }),
      menu({ id: 'allowed', permissionCode: ' Orders.Read ' }),
      menu({ id: 'same-code-platform', permissionCode: 'orders.read', permissionScope: 'platform' })
    ]
  };

  assert.deepEqual(navigationPermissionCodes([navigation]), {
    tenant: ['orders.admin', 'orders.read'],
    platform: ['orders.read']
  });
  assert.deepEqual(
    filterNavigationsByPermissions([navigation], { tenant: ['orders.read'], platform: [] })[0].menus.map(
      item => item.id
    ),
    ['public', 'allowed']
  );
});

test('external application links allow only absolute HTTP(S) URLs without credentials', () => {
  const scriptURL = ['java', 'script:alert(1)'].join('');
  assert.equal(safeExternalURL('https://docs.example.com/path'), 'https://docs.example.com/path');
  assert.equal(safeExternalURL('http://localhost:8080/docs'), 'http://localhost:8080/docs');
  assert.equal(safeExternalURL(scriptURL), '');
  assert.equal(safeExternalURL('data:text/html,unsafe'), '');
  assert.equal(safeExternalURL('//example.com/docs'), '');
  assert.equal(safeExternalURL('https://user:secret@example.com/docs'), '');
});

test('navigationToRoutes excludes action permission nodes', () => {
  const navigation = {
    application: {
      id: 'app-1',
      code: 'platform-admin',
      name: '平台管理',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [] as Array<{
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
    }>
  };
  navigation.menus.push({
    id: 'action-1',
    application_id: navigation.application.id,
    parent_id: '',
    code: 'users.create',
    type: 'action',
    name: '创建用户',
    i18n_key: '',
    route: '',
    component: '',
    icon: '',
    external_url: '',
    permission_code: 'identity.users.create',
    sort_order: 99,
    visible: false,
    status: 'active'
  });

  const routes = navigationToRoutes(navigation);
  assert.equal(JSON.stringify(routes).includes('users.create'), false);
});

test('applicationEntryPath uses only an installed configured default and otherwise opens the workspace', () => {
  const navigation = {
    application: {
      id: 'app-1',
      code: 'billing-center',
      name: 'Billing',
      description: '',
      icon: '',
      default_route: 'payments',
      status: 'active'
    },
    menus: [
      {
        id: 'menu-1',
        application_id: 'app-1',
        parent_id: '',
        code: 'list',
        type: 'page',
        name: '订单',
        i18n_key: '',
        route: 'list',
        component: 'billing-center.plans',
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 1,
        visible: true,
        status: 'active'
      },
      {
        id: 'menu-2',
        application_id: 'app-1',
        parent_id: '',
        code: 'payments',
        type: 'page',
        name: '报表',
        i18n_key: '',
        route: 'payments',
        component: 'billing-center.payments',
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 2,
        visible: true,
        status: 'active'
      }
    ]
  };

  assert.equal(applicationEntryPath(navigation), '/apps/billing-center/payments');
  navigation.menus[1]!.component = 'billing-center.future';
  assert.equal(applicationEntryPath(navigation), '/apps/billing-center/overview');
  navigation.application.default_route = 'missing';
  assert.equal(applicationEntryPath(navigation), '/apps/billing-center/overview');
});

test('every application has a workspace and exposes only visible page shortcuts', () => {
  const navigation = {
    application: {
      id: 'app-1',
      code: 'orders',
      name: 'Orders',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      {
        id: 'visible',
        application_id: 'app-1',
        parent_id: '',
        code: 'list',
        type: 'page',
        name: '订单',
        i18n_key: '',
        route: 'list',
        component: 'orders.list',
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 1,
        visible: true,
        status: 'active'
      },
      {
        id: 'action',
        application_id: 'app-1',
        parent_id: '',
        code: 'create',
        type: 'action',
        name: '创建',
        i18n_key: '',
        route: '',
        component: '',
        icon: '',
        external_url: '',
        permission_code: 'orders.create',
        sort_order: 2,
        visible: true,
        status: 'active'
      }
    ]
  };

  assert.equal(applicationEntryPath({ ...navigation, menus: [] }), '/apps/orders/overview');
  assert.deepEqual(
    applicationMenuEntries(navigation).map(item => item.path),
    ['/apps/orders/list']
  );
  assert.equal(applicationMenuEntries(navigation)[0]?.available, false);
});

test('workspace sections follow the top-level menu directory and tolerate cyclic parents', () => {
  const navigation = {
    application: {
      id: 'billing-id',
      code: 'billing-center',
      name: 'Billing',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      applicationMenu({ id: 'root-page', component: 'billing-center.plans', sort_order: 1 }),
      applicationMenu({ id: 'finance', type: 'directory', name: '财务管理', route: 'finance', sort_order: 2 }),
      applicationMenu({
        id: 'invoices',
        parent_id: 'finance',
        component: 'billing-center.invoices',
        sort_order: 3
      }),
      applicationMenu({ id: 'cycle-a', type: 'directory', parent_id: 'cycle-b', route: 'cycle-a' }),
      applicationMenu({ id: 'cycle-b', type: 'directory', parent_id: 'cycle-a', route: 'cycle-b' }),
      applicationMenu({
        id: 'cycle-page',
        parent_id: 'cycle-a',
        component: 'billing-center.payments',
        sort_order: 4
      })
    ]
  } as Parameters<typeof applicationMenuSections>[0];

  assert.deepEqual(
    applicationMenuSections(navigation).map(section => ({
      id: section.id,
      label: section.label,
      entries: section.entries.map(entry => entry.id)
    })),
    [
      { id: '__root__', label: '功能入口', entries: ['root-page'] },
      { id: 'finance', label: '财务管理', entries: ['invoices'] },
      { id: 'cycle-b', label: 'cycle-b', entries: ['cycle-page'] }
    ]
  );
});

test('activeApplicationRoutes mounts only a runnable selected application workspace', () => {
  const navigation = (
    id: string,
    code: string,
    component: string
  ): Parameters<typeof activeApplicationRoutes>[0][number] => ({
    application: {
      id,
      code,
      name: code,
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [
      {
        id: `${id}-home`,
        application_id: id,
        parent_id: '',
        code: 'home',
        type: 'page',
        name: '首页',
        i18n_key: '',
        route: 'home',
        component,
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 1,
        visible: true,
        status: 'active'
      }
    ]
  });
  const navigations = [
    navigation('app-a', 'platform-admin', 'platform-admin.users'),
    navigation('app-b', 'billing-center', 'billing-center.plans')
  ];

  const routes = activeApplicationRoutes(navigations, 'app-b');
  assert.deepEqual(
    routes.map(route => route.path),
    ['/applications', '/user-center', '/apps/billing-center']
  );
  assert.equal(JSON.stringify(routes).includes('/apps/platform-admin'), false);
  assert.deepEqual(
    activeApplicationRoutes(navigations, '').map(route => route.path),
    ['/applications', '/user-center']
  );
  assert.deepEqual(
    activeApplicationRoutes([navigation('future-id', 'billing-center', 'billing-center.future')], 'future-id').map(
      route => route.path
    ),
    ['/applications', '/user-center']
  );
});

test('session restoration retains only a granted and runnable application', () => {
  const application = {
    id: 'billing-id',
    code: 'billing-center',
    name: '计费中心',
    description: '',
    icon: '',
    default_route: '',
    status: 'active'
  } satisfies PlatformApplication;
  const navigation = {
    application,
    release: { id: 'release-id', version: 1 },
    menus: [applicationMenu({ id: 'plans', component: 'billing-center.plans' })]
  } as Parameters<typeof retainRunnableApplicationID>[1][number];

  assert.equal(retainRunnableApplicationID([application], [navigation], application.id), application.id);
  assert.equal(retainRunnableApplicationID([], [navigation], application.id), '');
  assert.equal(retainRunnableApplicationID([application], [], application.id), '');
  assert.equal(
    retainRunnableApplicationID(
      [application],
      [{ ...navigation, menus: [applicationMenu({ id: 'future', component: 'billing-center.future' })] }],
      application.id
    ),
    ''
  );
});

test('deep links resolve only an exact route from a runnable application', () => {
  const navigation = {
    application: {
      id: 'billing-id',
      code: 'billing-center',
      name: '计费中心',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [applicationMenu({ id: 'plans', route: 'plans', component: 'billing-center.plans' })]
  } as Parameters<typeof runnableApplicationIDForPath>[0][number];

  assert.equal(runnableApplicationIDForPath([navigation], '/apps/billing-center/plans'), 'billing-id');
  assert.equal(runnableApplicationIDForPath([navigation], '/apps/billing-center/overview'), 'billing-id');
  assert.equal(runnableApplicationIDForPath([navigation], '/apps/billing-center/unknown'), '');
  assert.equal(runnableApplicationIDForPath([navigation], '/apps/billing-center'), '');
  assert.equal(
    runnableApplicationIDForPath(
      [
        {
          ...navigation,
          menus: [
            ...navigation.menus,
            applicationMenu({ id: 'future', route: 'future', component: 'billing-center.future' })
          ]
        }
      ],
      '/apps/billing-center/future'
    ),
    ''
  );
  assert.equal(
    runnableApplicationIDForPath(
      [
        {
          ...navigation,
          menus: [applicationMenu({ id: 'future', route: 'future', component: 'billing-center.future' })]
        }
      ],
      '/apps/billing-center/future'
    ),
    ''
  );
});

test('application compatibility distinguishes installed, external and unavailable pages', () => {
  const navigation = {
    application: {
      id: 'billing-id',
      code: 'billing-center',
      name: 'Billing',
      description: '',
      icon: '',
      default_route: '',
      status: 'active',
      sort_order: 1,
      version: 1
    },
    release_version: 1,
    menus: [
      applicationMenu({ id: 'installed', code: 'plans', component: 'billing-center.plans' }),
      applicationMenu({ id: 'future', code: 'future', component: 'billing-center.future' }),
      applicationMenu({ id: 'external', code: 'docs', type: 'external', external_url: 'https://example.com/docs' }),
      applicationMenu({ id: 'hidden', code: 'hidden', component: 'billing-center.hidden', visible: false })
    ]
  } as Parameters<typeof applicationNavigationCompatibility>[0];

  assert.deepEqual(applicationNavigationCompatibility(navigation), {
    supportedPages: 1,
    unsupportedPages: 1,
    externalPages: 1,
    usable: true
  });
  assert.equal(
    applicationNavigationCompatibility({
      ...navigation,
      menus: [applicationMenu({ id: 'future', code: 'future', component: 'billing-center.future' })]
    }).usable,
    false
  );
});

test('application entry statuses provide one shared user-facing reason', () => {
  assert.equal(applicationEntryStatusMessage('ready'), '');
  assert.match(applicationEntryStatusMessage('unpublished'), /尚未发布/);
  assert.match(applicationEntryStatusMessage('unavailable'), /尚未安装/);
  assert.match(applicationEntryStatusMessage('empty'), /暂无可用功能/);
});

test('every application entry point uses the same publication and compatibility decision', () => {
  const navigation = {
    application: {
      id: 'billing-id',
      code: 'billing-center',
      name: 'Billing',
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: [applicationMenu({ id: 'plans', component: 'billing-center.plans' })]
  } as NonNullable<Parameters<typeof applicationEntryDecision>[0]>;

  assert.deepEqual(applicationEntryDecision(), { status: 'unpublished', path: '' });
  assert.deepEqual(applicationEntryDecision({ ...navigation, menus: [] }), { status: 'empty', path: '' });
  assert.deepEqual(applicationEntryDecision(navigation), {
    status: 'ready',
    path: '/apps/billing-center/overview'
  });
  assert.equal(preferredApplicationEntryPath(navigation, '/apps/billing-center/plans'), '/apps/billing-center/plans');
  assert.equal(
    preferredApplicationEntryPath(navigation, '/apps/billing-center/not-authorized'),
    '/apps/billing-center/overview'
  );
  assert.deepEqual(
    applicationEntryDecision({
      ...navigation,
      menus: [applicationMenu({ id: 'future', component: 'billing-center.future' })]
    }),
    { status: 'unavailable', path: '' }
  );
  assert.equal(applicationEntryStatusLabel('unpublished'), '未发布');
  assert.equal(applicationEntryStatusLabel('unavailable'), '待安装');
  assert.equal(applicationEntryStatusLabel('empty'), '无可用功能');
  assert.equal(applicationEntryStatusLabel('ready'), '');
});
