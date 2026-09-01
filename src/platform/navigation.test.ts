import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationEntryPath, navigationToRoutes } from './navigation';

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

  const [route] = applicationRoute.children!;
  assert.equal(route.path, '/apps/identity-service/accounts');
  assert.equal(route.component, 'view.platform_page');
  assert.equal(route.name, 'platform_identity-service_accounts');
  assert.equal(applicationRoute.meta?.applicationId, 'app-1');
  assert.equal(route.meta?.applicationId, 'app-1');
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
  assert.equal(applicationEntryPath(navigation), '/apps/orders/list');
});
