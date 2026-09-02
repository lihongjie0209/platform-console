import type { ElegantConstRoute } from '@elegant-router/types';
import type { ApplicationMenu, PlatformApplication, PublishedNavigation } from '@/service/api/platform-navigation';
import { pageBelongsToApplication } from '@/apps/registry';

const FALLBACK_ICON = 'mdi:application-outline';

function routeSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'menu';
}

function routeName(application: PlatformApplication, menu: ApplicationMenu) {
  return `platform_${routeSegment(application.code)}_${routeSegment(menu.code || menu.id)}`;
}

function routePath(application: PlatformApplication, menu: ApplicationMenu) {
  const configured = menu.route.trim();
  const scope = `/apps/${routeSegment(application.code)}`;

  if (!configured) return `${scope}/${routeSegment(menu.code || menu.id)}`;
  if (configured.startsWith(`${scope}/`) || configured === scope) return configured;

  return `${scope}/${configured.replace(/^\/+/, '')}`;
}

function menuRoute(
  application: PlatformApplication,
  menu: ApplicationMenu,
  menus: ApplicationMenu[]
): ElegantConstRoute {
  const name = routeName(application, menu);
  const meta = {
    title: menu.name,
    icon: menu.icon || FALLBACK_ICON,
    order: menu.sort_order,
    hideInMenu: !menu.visible,
    permissionCode: menu.permission_code || undefined,
    applicationId: application.id
  };
  const props = {
    applicationCode: application.code,
    applicationName: application.name,
    menuCode: menu.code,
    menuName: menu.name,
    externalURL: menu.external_url || undefined,
    componentKey: menu.component || undefined
  };

  const children = childrenByParent(menus, menu.id);
  if (children.length) {
    return {
      name,
      path: routePath(application, menu),
      component: 'layout.base',
      meta,
      children: children.map(child => menuRoute(application, child, menus))
    } as ElegantConstRoute;
  }

  return {
    name,
    path: routePath(application, menu),
    component: 'view.platform_page',
    meta,
    props
  } as ElegantConstRoute;
}

function childrenByParent(menus: ApplicationMenu[], parentID: string) {
  return menus.filter(menu => menu.parent_id === parentID);
}

function executableMenus(application: PlatformApplication, menus: ApplicationMenu[]) {
  const keep = new Map<string, boolean>();
  const isExecutable = (menu: ApplicationMenu): boolean => {
    const cached = keep.get(menu.id);
    if (cached !== undefined) return cached;

    // Mark first so malformed cyclic catalog data fails closed instead of recursing forever.
    keep.set(menu.id, false);
    const executable =
      (menu.type === 'page' && pageBelongsToApplication(menu.component, application.code)) ||
      (menu.type === 'external' && Boolean(safeExternalURL(menu.external_url))) ||
      (menu.type === 'directory' && childrenByParent(menus, menu.id).some(isExecutable));
    keep.set(menu.id, executable);
    return executable;
  };

  return menus.filter(isExecutable);
}

function applicationWorkspaceRoute(application: PlatformApplication): ElegantConstRoute {
  return {
    name: `platform_${routeSegment(application.code)}_workspace`,
    path: applicationWorkspacePath(application),
    component: 'view.platform_page',
    meta: {
      title: '应用概览',
      icon: 'mdi:view-dashboard-outline',
      order: -1,
      applicationId: application.id
    },
    props: {
      applicationCode: application.code,
      applicationName: application.name,
      menuCode: '__workspace__',
      menuName: '应用概览',
      workspace: true
    }
  } as ElegantConstRoute;
}

export function applicationWorkspacePath(application: PlatformApplication) {
  return `/apps/${routeSegment(application.code)}/overview`;
}

/**
 * Converts only published, visible menu metadata to local Vue routes. Backend supplied
 * component strings are deliberately treated as data: the console never dynamically
 * imports a component name supplied by an application administrator.
 */
export function navigationToRoutes(navigation: PublishedNavigation): ElegantConstRoute[] {
  const { application } = navigation;
  const activeMenus = navigation.menus.filter(
    menu => menu.status === 'active' && menu.type !== 'action' && menu.type !== 'button'
  );
  const menus = executableMenus(application, activeMenus).sort((left, right) => left.sort_order - right.sort_order);
  const roots = menus.filter(menu => !menu.parent_id || !menus.some(candidate => candidate.id === menu.parent_id));

  const scope = `/apps/${routeSegment(application.code)}`;
  const children = [applicationWorkspaceRoute(application), ...roots.map(menu => menuRoute(application, menu, menus))];

  return [
    {
      name: `platform_${routeSegment(application.code)}`,
      path: scope,
      component: 'layout.base',
      meta: {
        title: application.name,
        icon: application.icon || FALLBACK_ICON,
        order: 100,
        applicationId: application.id
      },
      children
    } as ElegantConstRoute
  ];
}

export function applicationEntryPath(navigation: PublishedNavigation) {
  const [applicationRoute] = navigationToRoutes(navigation);
  const workspacePath = applicationWorkspacePath(navigation.application);
  const executablePaths = new Set([
    workspacePath,
    ...applicationMenuEntries(navigation)
      .filter(entry => entry.available)
      .map(entry => entry.path)
  ]);

  const configured = navigation.application.default_route.trim();
  if (configured) {
    const scope = applicationRoute.path;
    const candidate = configured.startsWith(`${scope}/`) ? configured : `${scope}/${configured.replace(/^\/+/, '')}`;
    if (executablePaths.has(candidate)) return candidate;
  }

  return workspacePath;
}

export interface ApplicationMenuEntry {
  id: string;
  parentID: string;
  code: string;
  name: string;
  icon: string;
  path: string;
  externalURL: string;
  available: boolean;
}

export interface ApplicationMenuSection {
  id: string;
  label: string;
  entries: ApplicationMenuEntry[];
}

export interface ApplicationNavigationCompatibility {
  supportedPages: number;
  unsupportedPages: number;
  externalPages: number;
  usable: boolean;
}

export type ApplicationEntryStatus = 'ready' | 'unpublished' | 'unavailable' | 'empty';

export interface ApplicationEntryDecision {
  status: ApplicationEntryStatus;
  path: string;
}

export function safeExternalURL(raw: string) {
  try {
    const parsed = new URL(raw);
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) {
      return parsed.href;
    }
  } catch {
    // Legacy or malformed catalog data fails closed and is not rendered as a link.
  }
  return '';
}

/** Reports whether the current console release can execute an application's published navigation. */
export function applicationNavigationCompatibility(
  navigation: PublishedNavigation
): ApplicationNavigationCompatibility {
  const result: ApplicationNavigationCompatibility = {
    supportedPages: 0,
    unsupportedPages: 0,
    externalPages: 0,
    usable: false
  };
  for (const menu of navigation.menus) {
    if (menu.status === 'active' && menu.visible) {
      if (menu.type === 'external' && safeExternalURL(menu.external_url)) {
        result.externalPages += 1;
      } else if (menu.type === 'page') {
        if (pageBelongsToApplication(menu.component, navigation.application.code)) result.supportedPages += 1;
        else result.unsupportedPages += 1;
      }
    }
  }
  result.usable = result.supportedPages > 0 || result.externalPages > 0;
  return result;
}

export function applicationEntryDecision(navigation?: PublishedNavigation): ApplicationEntryDecision {
  if (!navigation) return { status: 'unpublished', path: '' };
  const compatibility = applicationNavigationCompatibility(navigation);
  if (!compatibility.usable) {
    return { status: compatibility.unsupportedPages > 0 ? 'unavailable' : 'empty', path: '' };
  }
  const path = applicationEntryPath(navigation);
  return path ? { status: 'ready', path } : { status: 'unpublished', path: '' };
}

/** Restores a page only when it remains executable in the current published navigation. */
export function preferredApplicationEntryPath(navigation: PublishedNavigation | undefined, preferredPath: string) {
  const decision = applicationEntryDecision(navigation);
  if (decision.status !== 'ready' || !navigation || !preferredPath) return decision.path;
  return runnableApplicationIDForPath([navigation], preferredPath) === navigation.application.id
    ? preferredPath
    : decision.path;
}

export function applicationEntryStatusLabel(status: ApplicationEntryStatus) {
  if (status === 'unavailable') return '待安装';
  if (status === 'empty') return '无可用功能';
  if (status === 'unpublished') return '未发布';
  return '';
}

export function applicationEntryStatusMessage(status: ApplicationEntryStatus) {
  if (status === 'unavailable') return '当前控制台版本尚未安装该应用的可执行页面，请升级控制台或联系管理员';
  if (status === 'empty') return '当前账号在该应用下暂无可用功能，请联系管理员检查菜单与权限配置';
  if (status === 'unpublished') return '该应用尚未发布可用菜单';
  return '';
}

/** Keeps a persisted application selection only when it is still granted and runnable. */
export function retainRunnableApplicationID(
  applications: PlatformApplication[],
  navigations: PublishedNavigation[],
  preferredApplicationID: string
) {
  if (!applications.some(application => application.id === preferredApplicationID)) return '';

  const navigation = navigations.find(item => item.application.id === preferredApplicationID);
  return applicationEntryDecision(navigation).status === 'ready' ? preferredApplicationID : '';
}

/** Resolves an internal deep link without mounting routes from every application at once. */
export function runnableApplicationIDForPath(navigations: PublishedNavigation[], path: string) {
  const runnableNavigations = navigations.filter(navigation => applicationEntryDecision(navigation).status === 'ready');
  for (const navigation of runnableNavigations) {
    const scope = `/apps/${routeSegment(navigation.application.code)}`;
    const executablePaths = new Set([
      `${scope}/overview`,
      ...applicationMenuEntries(navigation)
        .filter(entry => entry.available)
        .map(entry => entry.path)
    ]);
    if (executablePaths.has(path)) return navigation.application.id;
  }

  return '';
}

/** Flattens published page menus into safe workspace shortcuts. */
export function applicationMenuEntries(navigation: PublishedNavigation): ApplicationMenuEntry[] {
  return navigation.menus
    .filter(
      menu =>
        menu.status === 'active' &&
        menu.visible &&
        (menu.type === 'page' || (menu.type === 'external' && Boolean(safeExternalURL(menu.external_url))))
    )
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(menu => {
      const externalURL = safeExternalURL(menu.external_url);
      return {
        id: menu.id,
        parentID: menu.parent_id,
        code: menu.code,
        name: menu.name,
        icon: menu.icon || FALLBACK_ICON,
        path: routePath(navigation.application, menu),
        externalURL,
        available:
          (menu.type === 'external' && Boolean(externalURL)) ||
          (menu.type === 'page' && pageBelongsToApplication(menu.component, navigation.application.code))
      };
    });
}

/** Preserves the catalog's top-level directory information on an application's workspace. */
export function applicationMenuSections(navigation: PublishedNavigation): ApplicationMenuSection[] {
  const menus = new Map(navigation.menus.map(menu => [menu.id, menu]));
  const sections = new Map<string, ApplicationMenuSection>();

  for (const entry of applicationMenuEntries(navigation)) {
    let parentID = entry.parentID;
    let directory: ApplicationMenu | undefined;
    const visited = new Set<string>();
    while (parentID && !visited.has(parentID)) {
      visited.add(parentID);
      const parent = menus.get(parentID);
      if (!parent) break;
      if (parent.type === 'directory') directory = parent;
      parentID = parent.parent_id;
    }

    const id = directory?.id || '__root__';
    const section = sections.get(id) ?? { id, label: directory?.name || '功能入口', entries: [] };
    section.entries.push(entry);
    sections.set(id, section);
  }

  return Array.from(sections.values());
}

export function applicationSelectionRoute(): ElegantConstRoute {
  return {
    name: 'applications',
    path: '/applications',
    component: 'layout.base$view.applications',
    meta: { title: '选择应用', icon: 'mdi:apps', order: -1 }
  } as ElegantConstRoute;
}

export function userCenterRoute(): ElegantConstRoute {
  return {
    name: 'user-center',
    path: '/user-center',
    component: 'layout.base$view.user-center',
    meta: { title: '个人中心', hideInMenu: true }
  } as ElegantConstRoute;
}

/**
 * Builds the authenticated route set for the application shell. The launcher is
 * always available, while business routes are mounted for exactly one selected
 * application so menus, breadcrumbs and global search cannot leak across app
 * workspaces.
 */
export function activeApplicationRoutes(navigations: PublishedNavigation[], applicationId: string) {
  const routes = [applicationSelectionRoute(), userCenterRoute()];
  if (!applicationId) return routes;

  const navigation = navigations.find(item => item.application.id === applicationId);
  if (applicationEntryDecision(navigation).status === 'ready' && navigation) {
    routes.push(...navigationToRoutes(navigation));
  }

  return routes;
}

export type MenuPermissionScope = 'tenant' | 'platform';

export interface PermissionRequirement {
  scope: MenuPermissionScope;
  codes: string | string[];
  strategy?: 'any' | 'all';
}

export function normalizeMenuPermissionScope(value: unknown): MenuPermissionScope {
  return value === 'platform' ? 'platform' : 'tenant';
}

export function hasAllowedPermission(
  allowedCodes: Record<MenuPermissionScope, string[]>,
  requirement?: PermissionRequirement
) {
  if (!requirement) return true;
  const expected = (typeof requirement.codes === 'string' ? [requirement.codes] : requirement.codes)
    .map(code => code.trim().toLowerCase())
    .filter(Boolean);
  if (!expected.length) return false;
  const allowed = new Set(allowedCodes[requirement.scope].map(code => code.trim().toLowerCase()).filter(Boolean));
  return requirement.strategy === 'all'
    ? expected.every(code => allowed.has(code))
    : expected.some(code => allowed.has(code));
}

function menuPermissionScope(menu: ApplicationMenu): MenuPermissionScope {
  return normalizeMenuPermissionScope(menu.permission_scope);
}

export function navigationPermissionCodes(navigations: PublishedNavigation[]) {
  const result: Record<MenuPermissionScope, string[]> = { tenant: [], platform: [] };
  const seen: Record<MenuPermissionScope, Set<string>> = { tenant: new Set(), platform: new Set() };
  for (const navigation of navigations) {
    for (const menu of navigation.menus) {
      const code = menu.permission_code.trim().toLowerCase();
      const scope = menuPermissionScope(menu);
      if (code && !seen[scope].has(code)) {
        seen[scope].add(code);
        result[scope].push(code);
      }
    }
  }
  return result;
}

/** Removes protected menus unless the current tenant membership has every protected ancestor grant. */
export function filterNavigationsByPermissions(
  navigations: PublishedNavigation[],
  allowedCodes: Record<MenuPermissionScope, string[]>
) {
  const allowed: Record<MenuPermissionScope, Set<string>> = {
    tenant: new Set(allowedCodes.tenant.map(code => code.trim().toLowerCase()).filter(Boolean)),
    platform: new Set(allowedCodes.platform.map(code => code.trim().toLowerCase()).filter(Boolean))
  };
  return navigations.map(navigation => {
    const byID = new Map(navigation.menus.map(menu => [menu.id, menu]));
    const visibility = new Map<string, boolean>();
    const visiting = new Set<string>();
    const isAllowed = (menu: ApplicationMenu): boolean => {
      const cached = visibility.get(menu.id);
      if (cached !== undefined) return cached;
      if (visiting.has(menu.id)) return false;
      visiting.add(menu.id);
      const permissionCode = menu.permission_code.trim().toLowerCase();
      const permissionScope = menuPermissionScope(menu);
      const parent = menu.parent_id ? byID.get(menu.parent_id) : undefined;
      const result =
        (!permissionCode || allowed[permissionScope].has(permissionCode)) && (!parent || isAllowed(parent));
      visiting.delete(menu.id);
      visibility.set(menu.id, result);
      return result;
    };
    return { ...navigation, menus: navigation.menus.filter(isAllowed) };
  });
}
