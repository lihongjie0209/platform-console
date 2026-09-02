import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lastApplicationPath,
  normalizeApplicationRouteHistory,
  recordApplicationPath
} from './application-route-history';

test('application route history is isolated by user tenant and application', () => {
  let history = recordApplicationPath([], {
    subject: 'user-a',
    tenantId: 'tenant-a',
    applicationId: 'orders',
    path: '/apps/orders/list'
  });
  history = recordApplicationPath(history, {
    subject: 'user-a',
    tenantId: 'tenant-a',
    applicationId: 'billing',
    path: '/apps/billing/invoices'
  });
  history = recordApplicationPath(history, {
    subject: 'user-a',
    tenantId: 'tenant-a',
    applicationId: 'orders',
    path: '/apps/orders/detail'
  });

  assert.equal(
    lastApplicationPath(history, { subject: 'user-a', tenantId: 'tenant-a', applicationId: 'orders' }),
    '/apps/orders/detail'
  );
  assert.equal(
    lastApplicationPath(history, { subject: 'user-a', tenantId: 'tenant-b', applicationId: 'orders' }),
    undefined
  );
  assert.equal(history.length, 2);
});

test('application route history rejects malformed and non-application paths', () => {
  assert.deepEqual(normalizeApplicationRouteHistory(null), []);
  assert.deepEqual(
    normalizeApplicationRouteHistory([
      { subject: 'user', tenantId: 'tenant', applicationId: 'app', path: '/login' },
      { subject: ' user ', tenantId: ' tenant ', applicationId: ' app ', path: ' /apps/app/list ' }
    ]),
    [{ subject: 'user', tenantId: 'tenant', applicationId: 'app', path: '/apps/app/list' }]
  );
});
