import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRecentApplicationScopes, recentApplicationIDs, recordRecentApplication } from './application-recents';
import type { RecentApplicationScope } from './application-recents';

test('recent applications are isolated by user and tenant and ordered by latest visit', () => {
  let scopes = recordRecentApplication([], { subject: 'user-a', tenantId: 'tenant-a', applicationId: 'orders' });
  scopes = recordRecentApplication(scopes, { subject: 'user-a', tenantId: 'tenant-a', applicationId: 'billing' });
  scopes = recordRecentApplication(scopes, { subject: 'user-a', tenantId: 'tenant-a', applicationId: 'orders' });
  scopes = recordRecentApplication(scopes, { subject: 'user-a', tenantId: 'tenant-b', applicationId: 'audit' });
  scopes = recordRecentApplication(scopes, { subject: 'user-b', tenantId: 'tenant-a', applicationId: 'registry' });

  assert.deepEqual(recentApplicationIDs(scopes, 'user-a', 'tenant-a'), ['orders', 'billing']);
  assert.deepEqual(recentApplicationIDs(scopes, 'user-a', 'tenant-b'), ['audit']);
  assert.deepEqual(recentApplicationIDs(scopes, 'user-b', 'tenant-a'), ['registry']);
});

test('recent application storage is bounded and ignores incomplete scope', () => {
  let scopes: RecentApplicationScope[] = [];
  for (let index = 0; index < 25; index += 1) {
    scopes = recordRecentApplication(scopes, {
      subject: `user-${index}`,
      tenantId: 'tenant',
      applicationId: `app-${index}`
    });
  }
  for (let index = 0; index < 10; index += 1) {
    scopes = recordRecentApplication(scopes, {
      subject: 'active-user',
      tenantId: 'active-tenant',
      applicationId: `app-${index}`
    });
  }

  assert.equal(scopes.length, 20);
  assert.deepEqual(recentApplicationIDs(scopes, 'active-user', 'active-tenant'), [
    'app-9',
    'app-8',
    'app-7',
    'app-6',
    'app-5',
    'app-4'
  ]);
  assert.equal(
    recordRecentApplication(scopes, { subject: '', tenantId: 'active-tenant', applicationId: 'ignored' }),
    scopes
  );
});

test('recent application storage rejects malformed browser data', () => {
  assert.deepEqual(normalizeRecentApplicationScopes({ subject: 'user' }), []);
  assert.deepEqual(
    normalizeRecentApplicationScopes([
      null,
      { subject: '', tenantId: 'tenant', applicationIds: ['ignored'] },
      { subject: ' user ', tenantId: ' tenant ', applicationIds: ['orders', 12, '', 'orders', 'billing'] }
    ]),
    [{ subject: 'user', tenantId: 'tenant', applicationIds: ['orders', 'billing'] }]
  );
});
