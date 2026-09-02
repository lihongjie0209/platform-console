import type { ApplicationMenu } from './api';

export interface ApplicationMenuNode extends ApplicationMenu {
  children: ApplicationMenuNode[];
}

export interface MenuRouteCandidate {
  id?: string;
  parent_id?: string;
  code?: string;
  type?: string;
  route?: string;
  status?: string;
}

export interface MenuRouteConflict {
  path: string;
  menuCode: string;
}

function routeSegment(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'menu'
  );
}

export function normalizedMenuRoute(applicationCode: string, menu: MenuRouteCandidate) {
  const scope = `/apps/${routeSegment(applicationCode)}`;
  const configured = String(menu.route || '').trim();
  if (!configured) return `${scope}/${routeSegment(String(menu.code || menu.id || ''))}`;
  if (configured === scope || configured.startsWith(`${scope}/`)) return configured;
  return `${scope}/${configured.replace(/^\/+/, '')}`;
}

export function findMenuRouteConflict(
  applicationCode: string,
  menus: MenuRouteCandidate[],
  candidate: MenuRouteCandidate
): MenuRouteConflict | undefined {
  if (candidate.type === 'action') return undefined;
  const scope = `/apps/${routeSegment(applicationCode)}`;
  const path = normalizedMenuRoute(applicationCode, candidate);
  if (path === scope) return { path, menuCode: '__application__' };
  if (path === `${scope}/overview`) return { path, menuCode: '__workspace__' };

  const conflicting = menus.find(
    menu =>
      menu.id !== candidate.id &&
      (menu.status === undefined || menu.status === '' || menu.status === 'active') &&
      menu.type !== 'action' &&
      normalizedMenuRoute(applicationCode, menu) === path
  );
  return conflicting ? { path, menuCode: String(conflicting.code || conflicting.id || '') } : undefined;
}

export function isApplicationDefaultRouteValid(
  applicationCode: string,
  defaultRoute: string,
  menus: MenuRouteCandidate[]
) {
  const configured = defaultRoute.trim();
  if (!configured) return true;

  const scope = `/apps/${routeSegment(applicationCode)}`;
  const candidate = configured.startsWith(`${scope}/`) ? configured : `${scope}/${configured.replace(/^\/+/, '')}`;
  if (candidate === `${scope}/overview`) return true;

  const activeMenus = menus.filter(
    menu => (menu.status === undefined || menu.status === '' || menu.status === 'active') && menu.type !== 'action'
  );
  const parentIDs = new Set(activeMenus.map(menu => String(menu.parent_id || '')).filter(Boolean));
  return activeMenus.some(
    menu => !parentIDs.has(String(menu.id || '')) && normalizedMenuRoute(applicationCode, menu) === candidate
  );
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
