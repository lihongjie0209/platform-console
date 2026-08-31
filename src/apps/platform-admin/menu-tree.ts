import type { ApplicationMenu } from './api';

export interface ApplicationMenuNode extends ApplicationMenu {
  children: ApplicationMenuNode[];
}

export function buildMenuTree(items: ApplicationMenu[]): ApplicationMenuNode[] {
  const nodes = new Map<string, ApplicationMenuNode>();
  for (const item of items) {
    if (item.id) nodes.set(item.id, { ...item, children: [] });
  }

  const roots: ApplicationMenuNode[] = [];
  for (const item of items) {
    const node = item.id ? nodes.get(item.id) : undefined;
    if (node) {
      const parent = item.parent_id ? nodes.get(item.parent_id) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const sortNodes = (values: ApplicationMenuNode[]) => {
    values.sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
    values.forEach(value => sortNodes(value.children));
  };
  sortNodes(roots);
  return roots;
}

export function descendantMenuIDs(items: ApplicationMenu[], menuID: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const item of items) {
    if (item.id && item.parent_id) {
      const values = children.get(item.parent_id) || [];
      values.push(item.id);
      children.set(item.parent_id, values);
    }
  }
  const result = new Set<string>([menuID]);
  const pending = [menuID];
  while (pending.length) {
    const parentID = pending.pop()!;
    for (const childID of children.get(parentID) || []) {
      if (!result.has(childID)) {
        result.add(childID);
        pending.push(childID);
      }
    }
  }
  return result;
}
