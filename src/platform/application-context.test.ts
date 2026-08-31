import test from 'node:test';
import assert from 'node:assert/strict';
import type { PlatformApplication, PublishedNavigation, TenantSummary } from '@/service/api/platform-navigation';
import { filterApplications, retainActiveNavigations, selectActiveTenant } from './application-context';

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
    status: 'active'
  },
  {
    id: 'app-b',
    code: 'legacy',
    name: 'Legacy',
    description: '',
    icon: '',
    default_route: '',
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
