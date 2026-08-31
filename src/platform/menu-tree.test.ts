import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationMenu } from '../apps/platform-admin/api';
import { buildMenuTree, descendantMenuIDs } from '../apps/platform-admin/menu-tree';

const menus = [
  { id: 'child', parent_id: 'root', sort_order: 2, code: 'child' },
  { id: 'root', parent_id: '', sort_order: 1, code: 'root' },
  { id: 'grandchild', parent_id: 'child', sort_order: 1, code: 'grandchild' }
] as ApplicationMenu[];

test('buildMenuTree creates a stable sorted hierarchy', () => {
  const tree = buildMenuTree(menus);
  assert.equal(tree[0].id, 'root');
  assert.equal(tree[0].children[0].id, 'child');
  assert.equal(tree[0].children[0].children[0].id, 'grandchild');
});

test('descendantMenuIDs prevents cyclic parent selection', () => {
  assert.deepEqual([...descendantMenuIDs(menus, 'child')].sort(), ['child', 'grandchild']);
});
