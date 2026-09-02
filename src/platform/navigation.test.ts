import test from 'node:test';
import assert from 'node:assert/strict';
import type { ApplicationMenu } from '@/service/api/platform-navigation';
import {
  activeApplicationRoutes,
  applicationEntryDecision,
  applicationEntryPath,
  applicationMenuEntries,
  applicationNavigationCompatibility,
  filterNavigationsByPermissions,
  navigationPermissionCodes,
  navigationToRoutes,
  normalizeMenuPermissionScope,
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

test('navigationToRoutes scopes routes and never evaluates backend component names', () => {
  const [applicationRoute] = navigationToRoutes({
    application: {
      id: 'app-1',
      code: 'Identity Service',
      name: 'Identity',
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
        component: '../../untrusted',
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
  assert.equal(route.path, '/apps/identity-service/accounts');
  assert.equal(route.component, 'view.platform_page');
  assert.equal(route.name, 'platform_identity-service_accounts');
  assert.equal(applicationRoute.meta?.applicationId, 'app-1');
  assert.equal(route.meta?.applicationId, 'app-1');
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

test('applicationEntryPath uses a valid configured default and falls back to the first page', () => {
  const navigation = {
    application: {
      id: 'app-1',
      code: 'orders',
      name: 'Orders',
      description: '',
      icon: '',
      default_route: 'reports',
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
        component: 'platform.page',
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
        code: 'reports',
        type: 'page',
        name: '报表',
        i18n_key: '',
        route: 'reports',
        component: 'platform.page',
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 2,
        visible: true,
        status: 'active'
      }
    ]
  };

  assert.equal(applicationEntryPath(navigation), '/apps/orders/reports');
  navigation.application.default_route = 'missing';
  assert.equal(applicationEntryPath(navigation), '/apps/orders/overview');
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
});

test('activeApplicationRoutes mounts only the selected application workspace', () => {
  const navigation = (id: string, code: string): Parameters<typeof activeApplicationRoutes>[0][number] => ({
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
        component: `${code}.home`,
        icon: '',
        external_url: '',
        permission_code: '',
        sort_order: 1,
        visible: true,
        status: 'active'
      }
    ]
  });
  const navigations = [navigation('app-a', 'orders'), navigation('app-b', 'billing')];

  const routes = activeApplicationRoutes(navigations, 'app-b');
  assert.deepEqual(
    routes.map(route => route.path),
    ['/applications', '/apps/billing']
  );
  assert.equal(JSON.stringify(routes).includes('/apps/orders'), false);
  assert.deepEqual(
    activeApplicationRoutes(navigations, '').map(route => route.path),
    ['/applications']
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
  assert.deepEqual(applicationEntryDecision(navigation), {
    status: 'ready',
    path: '/apps/billing-center/overview'
  });
  assert.deepEqual(
    applicationEntryDecision({
      ...navigation,
      menus: [applicationMenu({ id: 'future', component: 'billing-center.future' })]
    }),
    { status: 'unavailable', path: '' }
  );
});
