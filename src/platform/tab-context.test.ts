import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileContextTabs } from './tab-context';

const tabs = [
  { id: '/apps/orders/list', routeKey: 'orders-list' },
  { id: '/apps/billing/invoices', routeKey: 'billing-invoices' }
];

test('tenant navigation refresh removes tabs whose routes are no longer available', () => {
  const result = reconcileContextTabs(tabs, new Set<PropertyKey>(['orders-list']), {
    activeTabId: '/apps/orders/list',
    homeTabId: '/applications'
  });

  assert.deepEqual(result.tabs, [tabs[0]]);
  assert.equal(result.activeTabId, '/apps/orders/list');
  assert.equal(tabs.length, 2);
});

test('tenant navigation refresh falls back to the application launcher when the active tab disappears', () => {
  const result = reconcileContextTabs(tabs, new Set<PropertyKey>(['orders-list']), {
    activeTabId: '/apps/billing/invoices',
    homeTabId: '/applications'
  });

  assert.deepEqual(result.tabs, [tabs[0]]);
  assert.equal(result.activeTabId, '/applications');
});
