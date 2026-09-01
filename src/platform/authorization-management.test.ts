import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizationManagementContextKey, authorizationManagementScopeOptions } from './authorization-management';

test('authorization management context separates tenant and platform datasets', () => {
  assert.equal(authorizationManagementContextKey(' tenant-1 ', 'tenant'), 'tenant-1:tenant');
  assert.equal(authorizationManagementContextKey('tenant-1', 'platform'), 'tenant-1:platform');
  assert.notEqual(
    authorizationManagementContextKey('tenant-1', 'tenant'),
    authorizationManagementContextKey('tenant-1', 'platform')
  );
  assert.deepEqual(
    authorizationManagementScopeOptions.map(option => option.value),
    ['tenant', 'platform']
  );
});
