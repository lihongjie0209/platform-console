import assert from 'node:assert/strict';
import test from 'node:test';
import { switchTenantContext } from './tenant-switch';

test('tenant switch replaces routes only after the server scope exchange succeeds', async () => {
  const events: string[] = [];
  await switchTenantContext('tenant-b', {
    async selectTenant(tenantId) {
      events.push(`select:${tenantId}`);
    },
    refreshRoutes() {
      events.push('refresh');
    },
    async openApplicationLauncher() {
      events.push('navigate');
    }
  });
  assert.deepEqual(events, ['select:tenant-b', 'refresh', 'navigate']);
});

test('failed tenant scope exchange keeps the current routes and page', async () => {
  const events: string[] = [];
  await assert.rejects(
    switchTenantContext('tenant-b', {
      async selectTenant() {
        events.push('select');
        throw new Error('exchange failed');
      },
      refreshRoutes() {
        events.push('refresh');
      },
      async openApplicationLauncher() {
        events.push('navigate');
      }
    }),
    /exchange failed/
  );
  assert.deepEqual(events, ['select']);
});
