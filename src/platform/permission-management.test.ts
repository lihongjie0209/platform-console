import assert from 'node:assert/strict';
import test from 'node:test';
import { permissionManagementContextKey, permissionManagementScopeOptions } from './permission-management';

test('permission management context separates tenant and platform datasets', () => {
  assert.equal(permissionManagementContextKey(' tenant-1 ', 'tenant'), 'tenant-1:tenant');
  assert.equal(permissionManagementContextKey('tenant-1', 'platform'), 'tenant-1:platform');
  assert.notEqual(
    permissionManagementContextKey('tenant-1', 'tenant'),
    permissionManagementContextKey('tenant-1', 'platform')
  );
  assert.deepEqual(
    permissionManagementScopeOptions.map(option => option.value),
    ['tenant', 'platform']
  );
});
