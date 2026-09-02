import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationMenu } from '../apps/platform-admin/api';
import {
  buildMenuTree,
  descendantMenuIDs,
  findMenuRouteConflict,
  isApplicationDefaultRouteValid,
  normalizedMenuRoute
} from '../apps/platform-admin/menu-tree';

const menus = [
  { id: 'child', parent_id: 'root', sort_order: 2, code: 'child' },
  { id: 'root', parent_id: '', sort_order: 1, code: 'root' },
  { id: 'grandchild', parent_id: 'child', sort_order: 1, code: 'grandchild' }
] as ApplicationMenu[];

test('buildMenuTree creates a stable sorted hierarchy', () => {
  const tree = buildMenuTree(menus);
  assert.equal(tree[0].id, 'root');
  assert.equal(tree[0].children[0].id, 'child');
  assert.equal(tree[0].children[0].children[0].id, 'grandchild');
});

test('descendantMenuIDs prevents cyclic parent selection', () => {
  assert.deepEqual([...descendantMenuIDs(menus, 'child')].sort(), ['child', 'grandchild']);
});

test('menu route conflicts use the final application URL namespace', () => {
  const existing = [
    { id: 'plans', code: 'plans', type: 'page', route: 'plans', status: 'active' },
    { id: 'disabled', code: 'legacy', type: 'page', route: 'legacy', status: 'disabled' }
  ];
  assert.equal(normalizedMenuRoute('billing-center', existing[0]), '/apps/billing-center/plans');
  assert.deepEqual(
    findMenuRouteConflict('billing-center', existing, {
      id: 'new',
      code: 'legacy-plans',
      type: 'page',
      route: '/apps/billing-center/plans'
    }),
    { path: '/apps/billing-center/plans', menuCode: 'plans' }
  );
  assert.equal(
    findMenuRouteConflict('billing-center', existing, {
      id: 'plans',
      code: 'plans',
      type: 'page',
      route: 'plans'
    }),
    undefined
  );
  assert.equal(
    findMenuRouteConflict('billing-center', existing, {
      id: 'new',
      code: 'legacy',
      type: 'page',
      route: 'legacy'
    }),
    undefined
  );
  assert.deepEqual(
    findMenuRouteConflict('billing-center', existing, {
      code: 'overview',
      type: 'page',
      route: 'overview'
    }),
    { path: '/apps/billing-center/overview', menuCode: '__workspace__' }
  );
  assert.deepEqual(
    findMenuRouteConflict('billing-center', existing, {
      code: 'root',
      type: 'page',
      route: '/apps/billing-center'
    }),
    { path: '/apps/billing-center', menuCode: '__application__' }
  );
});

test('application default routes target an active leaf or the built-in overview', () => {
  const values = [
    { id: 'settings', code: 'settings', type: 'directory', route: 'settings', status: 'active' },
    { id: 'plans', parent_id: 'settings', code: 'plans', type: 'page', route: 'plans', status: 'active' },
    { id: 'legacy', code: 'legacy', type: 'page', route: 'legacy', status: 'disabled' }
  ];
  assert.equal(isApplicationDefaultRouteValid('billing-center', '', values), true);
  assert.equal(isApplicationDefaultRouteValid('billing-center', 'plans', values), true);
  assert.equal(isApplicationDefaultRouteValid('billing-center', '/apps/billing-center/plans', values), true);
  assert.equal(isApplicationDefaultRouteValid('billing-center', '/apps/billing-center/overview', values), true);
  assert.equal(isApplicationDefaultRouteValid('billing-center', 'settings', values), false);
  assert.equal(isApplicationDefaultRouteValid('billing-center', 'legacy', values), false);
  assert.equal(isApplicationDefaultRouteValid('billing-center', 'missing', values), false);
});
