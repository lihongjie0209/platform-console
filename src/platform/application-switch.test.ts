import assert from 'node:assert/strict';
import test from 'node:test';
import { switchApplicationContext } from './application-switch';

test('application switch selects context before replacing routes and restoring its page', async () => {
  const events: string[] = [];
  await switchApplicationContext(
    'billing',
    { status: 'ready', path: '/apps/billing/overview' },
    {
      selectApplication(id) {
        events.push(`select:${id}`);
      },
      refreshRoutes() {
        events.push('refresh');
      },
      entryPathForApplication(id) {
        events.push(`entry:${id}`);
        return '/apps/billing/invoices';
      },
      async navigate(path) {
        events.push(`navigate:${path}`);
      }
    }
  );
  assert.deepEqual(events, ['select:billing', 'refresh', 'entry:billing', 'navigate:/apps/billing/invoices']);
});

test('unavailable application cannot mutate the active context', async () => {
  let selected = false;
  await assert.rejects(
    switchApplicationContext(
      'future',
      { status: 'unavailable', path: '' },
      {
        selectApplication() {
          selected = true;
        },
        refreshRoutes() {},
        entryPathForApplication() {
          return '';
        },
        async navigate() {}
      }
    ),
    /尚未安装/
  );
  assert.equal(selected, false);
});
