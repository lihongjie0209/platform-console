export interface OrganizationTreeItem extends Record<string, unknown> {
  id?: string;
  parent_id?: string;
  code?: string;
  path?: string;
}

export type OrganizationTreeNode = OrganizationTreeItem & { children: OrganizationTreeNode[] };

export function buildOrganizationTree(items: OrganizationTreeItem[]): OrganizationTreeNode[] {
  const nodes = new Map<string, OrganizationTreeNode>();
  for (const item of items) nodes.set(String(item.id), { ...item, children: [] });

  const roots: OrganizationTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(String(node.parent_id || ''));
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (values: OrganizationTreeNode[]) => {
    values.sort((left, right) => String(left.path || left.code).localeCompare(String(right.path || right.code)));
    values.forEach(value => sort(value.children));
  };
  sort(roots);
  return roots;
}

export function descendantOrganizationIDs(items: OrganizationTreeItem[], id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const item of items) {
    const parentID = String(item.parent_id || '');
    const values = children.get(parentID) || [];
    values.push(String(item.id));
    children.set(parentID, values);
  }
  const result = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    for (const childID of children.get(queue.shift()!) || []) {
      if (!result.has(childID)) {
        result.add(childID);
        queue.push(childID);
      }
    }
  }
  return result;
}
