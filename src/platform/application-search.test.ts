import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationMenu, PublishedNavigation } from '@/service/api/platform-navigation';
import { searchApplicationNavigation } from './application-search';

function navigation(input: { id: string; code: string; name: string; menus: ApplicationMenu[] }): PublishedNavigation {
  return {
    application: {
      id: input.id,
      code: input.code,
      name: input.name,
      description: '',
      icon: '',
      default_route: '',
      status: 'active'
    },
    menus: input.menus
  };
}

function menu(applicationId: string, id: string, component: string): ApplicationMenu {
  return {
    id,
    application_id: applicationId,
    parent_id: '',
    code: id,
    type: 'page',
    name: id === 'invoices' ? '发票管理' : '审计记录',
    i18n_key: '',
    route: id,
    component,
    icon: '',
    external_url: '',
    permission_code: '',
    permission_scope: 'tenant',
    sort_order: 1,
    visible: true,
    status: 'active'
  };
}

test('global search discovers authorized pages across runnable applications', () => {
  const navigations = [
    navigation({
      id: 'audit-id',
      code: 'audit-center',
      name: '审计中心',
      menus: [menu('audit-id', 'records', 'audit-center.records')]
    }),
    navigation({
      id: 'billing-id',
      code: 'billing-center',
      name: '计费中心',
      menus: [
        menu('billing-id', 'invoices', 'billing-center.invoices'),
        menu('billing-id', 'future', 'billing-center.future')
      ]
    })
  ];

  assert.deepEqual(
    searchApplicationNavigation({ navigations, keyword: '发票', selectedApplicationId: 'audit-id' }).map(result => [
      result.applicationId,
      result.routePath
    ]),
    [['billing-id', '/apps/billing-center/invoices']]
  );
  assert.deepEqual(
    searchApplicationNavigation({ navigations, keyword: '中心', selectedApplicationId: 'billing-id' }).map(
      result => result.applicationId
    ),
    ['billing-id', 'billing-id', 'audit-id', 'audit-id']
  );
});

test('global search excludes unavailable pages and bounds empty input', () => {
  const navigations = [
    navigation({
      id: 'billing-id',
      code: 'billing-center',
      name: '计费中心',
      menus: [menu('billing-id', 'future', 'billing-center.future')]
    })
  ];
  assert.deepEqual(searchApplicationNavigation({ navigations, keyword: 'future', selectedApplicationId: '' }), []);
  assert.deepEqual(searchApplicationNavigation({ navigations, keyword: '  ', selectedApplicationId: '' }), []);
});
