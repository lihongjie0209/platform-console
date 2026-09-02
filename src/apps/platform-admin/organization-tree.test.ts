import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrganizationTree, descendantOrganizationIDs } from './organization-tree';

const items = [
  { id: 'child', parent_id: 'root', code: 'child', path: '/root/child/' },
  { id: 'root', parent_id: '', code: 'root', path: '/root/' },
  { id: 'leaf', parent_id: 'child', code: 'leaf', path: '/root/child/leaf/' }
];

test('buildOrganizationTree creates hierarchy independent of source order', () => {
  const tree = buildOrganizationTree(items);
  assert.equal(tree[0]?.id, 'root');
  assert.equal(tree[0]?.children[0]?.id, 'child');
  assert.equal(tree[0]?.children[0]?.children[0]?.id, 'leaf');
});

test('descendantOrganizationIDs prevents selecting self or descendants as parent', () => {
  assert.deepEqual([...descendantOrganizationIDs(items, 'child')].sort(), ['child', 'leaf']);
});
