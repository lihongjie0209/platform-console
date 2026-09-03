import assert from 'node:assert/strict';
import test from 'node:test';
import type { OrganizationUnit, OrganizationUnitTreeNode } from './api';
import { flattenOrganizationTree, mergeOrganizationDirectory } from './organization-directory';

const unit = (id: string, name = id): OrganizationUnit => ({ id, name }) as OrganizationUnit;

test('flattenOrganizationTree preserves parent-before-child order', () => {
  const tree = [
    {
      ...unit('root'),
      has_children: true,
      children: [{ ...unit('child'), has_children: false, children: [] }]
    }
  ] as OrganizationUnitTreeNode[];
  assert.deepEqual(
    flattenOrganizationTree(tree).map(item => item.id),
    ['root', 'child']
  );
});

test('mergeOrganizationDirectory refreshes identities without dropping hydrated labels', () => {
  assert.deepEqual(
    mergeOrganizationDirectory([unit('one', 'old'), unit('retained')], [unit('one', 'new')]).map(item => [
      item.id,
      item.name
    ]),
    [
      ['one', 'new'],
      ['retained', 'retained']
    ]
  );
});
