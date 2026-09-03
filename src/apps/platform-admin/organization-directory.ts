import type { OrganizationUnit, OrganizationUnitTreeNode } from './api';

export function flattenOrganizationTree(nodes: OrganizationUnitTreeNode[]): OrganizationUnit[] {
  return nodes.flatMap(node => [node, ...flattenOrganizationTree(node.children || [])]);
}

export function mergeOrganizationDirectory(
  current: OrganizationUnit[],
  incoming: OrganizationUnit[]
): OrganizationUnit[] {
  return Array.from(new Map([...current, ...incoming].map(item => [String(item.id), item])).values());
}
