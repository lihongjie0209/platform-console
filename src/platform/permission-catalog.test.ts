import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPermissionCatalogOptions } from './permission-catalog';

test('permission catalog options deduplicate active codes and preserve a legacy current value', () => {
  const options = buildPermissionCatalogOptions(
    [
      { code: ' application.read ', name: '查看应用', resource_type: 'application', action: 'read', status: 'active' },
      { code: 'application.read', name: '重复项', status: 'active' },
      { code: 'application.delete', status: 'disabled' },
      { code: '', status: 'active' }
    ],
    'legacy.permission'
  );

  assert.deepEqual(options, [
    { code: 'application.read', label: 'application.read — 查看应用 · application · read' },
    { code: 'legacy.permission', label: 'legacy.permission — 当前配置' }
  ]);
});
