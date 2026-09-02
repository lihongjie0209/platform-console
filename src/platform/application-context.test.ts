import test from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformApplication, PublishedNavigation, TenantSummary } from '@/service/api/platform-navigation';
import {
  applicationFilterScope,
  applicationScope,
  createLatestRequestGuard,
  createSerialTaskQueue,
  failedTenantSelectionContext,
  filterApplications,
  hasApplicationScope,
  retainActiveNavigations,
  selectActiveTenant,
  shouldReusePlatformContext
} from './application-context';

const tenants: TenantSummary[] = [
  { id: 'disabled', code: 'disabled', name: 'Disabled', status: 'disabled' },
  { id: 'tenant-a', code: 'a', name: 'Tenant A', status: 'active' },
  { id: 'tenant-b', code: 'b', name: 'Tenant B', status: 'active' }
];

const applications: PlatformApplication[] = [
  {
    id: 'app-a',
    code: 'orders',
    name: '订单中心',
    description: 'Order management',
    icon: '',
    default_route: '',
    sort_order: 20,
    status: 'active'
  },
  {
    id: 'app-b',
    code: 'legacy',
    name: 'Legacy',
    description: '',
    icon: '',
    default_route: '',
    sort_order: 10,
    status: 'disabled'
  }
];

test('selectActiveTenant restores only an active membership', () => {
  assert.equal(selectActiveTenant(tenants, 'tenant-b')?.id, 'tenant-b');
  assert.equal(selectActiveTenant(tenants, 'disabled')?.id, 'tenant-a');
});

test('application launcher filters search and removes inactive navigation', () => {
  const navigations = applications.map(application => ({ application, menus: [] })) as PublishedNavigation[];

  assert.deepEqual(
    filterApplications(applications, 'ORDER').map(item => item.id),
    ['app-a']
  );
  assert.deepEqual(
    retainActiveNavigations(applications, navigations).map(item => item.application.id),
    ['app-a']
  );
});

test('application launcher uses configured order with a stable name fallback', () => {
  const ordered = filterApplications(
    [
      applications[0],
      { ...applications[0], id: 'app-c', name: '账户中心', sort_order: 10 },
      { ...applications[0], id: 'app-d', name: '报表中心', sort_order: 10 }
    ],
    ''
  );
  assert.deepEqual(
    ordered.map(item => item.id),
    ['app-d', 'app-c', 'app-a']
  );
  assert.notEqual(ordered, applications);
});

test('application-scoped pages require both tenant and selected application', () => {
  assert.equal(hasApplicationScope('tenant-a', 'app-a'), true);
  assert.equal(hasApplicationScope('tenant-a', ''), false);
  assert.equal(hasApplicationScope('', 'app-a'), false);
  assert.deepEqual(applicationScope('tenant-a', 'app-a'), { tenant_id: 'tenant-a', application_id: 'app-a' });
  assert.deepEqual(applicationFilterScope('tenant-a', 'app-a'), {
    tenant_id: 'tenant-a',
    application_ids: ['app-a']
  });
  assert.throws(() => applicationScope('tenant-a', ' '), /tenant and application scope are required/);
  assert.throws(() => applicationFilterScope('', 'app-a'), /tenant and application scope are required/);
});

test('tenant scope changes are serialized even when the first operation fails', async () => {
  const enqueue = createSerialTaskQueue();
  const events: string[] = [];
  let releaseFirst!: () => void;
  let markFirstStarted!: () => void;
  const firstGate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  const firstStarted = new Promise<void>(resolve => {
    markFirstStarted = resolve;
  });

  const first = enqueue(async () => {
    events.push('first:start');
    markFirstStarted();
    await firstGate;
    events.push('first:end');
    throw new Error('selection failed');
  });
  const second = enqueue(async () => {
    events.push('second:start');
    events.push('second:end');
  });

  await firstStarted;
  assert.deepEqual(events, ['first:start']);
  releaseFirst();
  await assert.rejects(first, /selection failed/);
  await second;
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);
});

test('latest request guard rejects responses from an older application scope', () => {
  const guard = createLatestRequestGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
  guard.invalidate();
  assert.equal(guard.isCurrent(second), false);
});

test('failed tenant selection clears stale resources only after server scope exchange', () => {
  assert.deepEqual(
    failedTenantSelectionContext({
      scopeExchanged: false,
      previousTenantId: 'tenant-a',
      previousApplicationId: 'app-a',
      requestedTenantId: 'tenant-b'
    }),
    { tenantId: 'tenant-a', applicationId: 'app-a', clearResources: false }
  );
  assert.deepEqual(
    failedTenantSelectionContext({
      scopeExchanged: true,
      previousTenantId: 'tenant-a',
      previousApplicationId: 'app-a',
      requestedTenantId: 'tenant-b'
    }),
    { tenantId: 'tenant-b', applicationId: '', clearResources: true }
  );
});

test('platform context cache can be bypassed by an explicit retry', () => {
  const cached = { initializedSubject: 'user-a', requestedSubject: 'user-a', tenantCount: 2, force: false };
  assert.equal(shouldReusePlatformContext(cached), true);
  assert.equal(shouldReusePlatformContext({ ...cached, force: true }), false);
  assert.equal(shouldReusePlatformContext({ ...cached, requestedSubject: 'user-b' }), false);
  assert.equal(shouldReusePlatformContext({ ...cached, tenantCount: 0 }), false);
});
