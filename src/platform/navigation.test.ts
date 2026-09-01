import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeApplicationRoutes,
  applicationEntryPath,
  applicationMenuEntries,
  navigationToRoutes,
  safeExternalURL
} from './navigation';

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
