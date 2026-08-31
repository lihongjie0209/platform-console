import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationToRoutes } from './navigation';

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
});
