import assert from 'node:assert/strict';
import test from 'node:test';
import { usageApplicationScope } from './scope';

test('usageApplicationScope keeps tenant and application together', () => {
  assert.deepEqual(usageApplicationScope('tenant-1', 'app-1'), {
    tenant_id: 'tenant-1',
    application_id: 'app-1'
  });
  assert.throws(() => usageApplicationScope('tenant-1', ' '), /tenant and application scope are required/);
});
