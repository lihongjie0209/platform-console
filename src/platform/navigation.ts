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

function leafRoutePaths(routes: ElegantConstRoute[]): string[] {
  return routes.flatMap(route => (route.children?.length ? leafRoutePaths(route.children) : [route.path]));
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

function applicationWorkspaceRoute(application: PlatformApplication): ElegantConstRoute {
  return {
    name: `platform_${routeSegment(application.code)}_workspace`,
    path: `/apps/${routeSegment(application.code)}/overview`,
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

/**
 * Converts only published, visible menu metadata to local Vue routes. Backend supplied
 * component strings are deliberately treated as data: the console never dynamically
 * imports a component name supplied by an application administrator.
 */
export function navigationToRoutes(navigation: PublishedNavigation): ElegantConstRoute[] {
  const { application } = navigation;
  const menus = navigation.menus
    .filter(menu => menu.status === 'active' && menu.type !== 'action' && menu.type !== 'button')
    .sort((left, right) => left.sort_order - right.sort_order);
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
  const paths = leafRoutePaths(applicationRoute.children || []);
  if (!paths.length) return '';

  const configured = navigation.application.default_route.trim();
  if (configured) {
    const scope = applicationRoute.path;
    const candidate = configured.startsWith(`${scope}/`) ? configured : `${scope}/${configured.replace(/^\/+/, '')}`;
    if (paths.includes(candidate)) return candidate;
  }

  return paths[0];
}

export interface ApplicationMenuEntry {
  id: string;
  code: string;
  name: string;
  icon: string;
  path: string;
  externalURL: string;
}

export interface ApplicationNavigationCompatibility {
  supportedPages: number;
  unsupportedPages: number;
  externalPages: number;
  usable: boolean;
}

export type ApplicationEntryStatus = 'ready' | 'unpublished' | 'unavailable';

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
  if (!applicationNavigationCompatibility(navigation).usable) return { status: 'unavailable', path: '' };
  const path = applicationEntryPath(navigation);
  return path ? { status: 'ready', path } : { status: 'unpublished', path: '' };
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
    const routePaths = navigationToRoutes(navigation).flatMap(route => leafRoutePaths(route.children || [route]));
    if (routePaths.includes(path)) return navigation.application.id;
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
    .map(menu => ({
      id: menu.id,
      code: menu.code,
      name: menu.name,
      icon: menu.icon || FALLBACK_ICON,
      path: routePath(navigation.application, menu),
      externalURL: safeExternalURL(menu.external_url)
    }));
}

export function applicationSelectionRoute(): ElegantConstRoute {
  return {
    name: 'applications',
    path: '/applications',
    component: 'layout.base$view.applications',
    meta: { title: '选择应用', icon: 'mdi:apps', order: -1 }
  } as ElegantConstRoute;
}

/**
 * Builds the authenticated route set for the application shell. The launcher is
 * always available, while business routes are mounted for exactly one selected
 * application so menus, breadcrumbs and global search cannot leak across app
 * workspaces.
 */
export function activeApplicationRoutes(navigations: PublishedNavigation[], applicationId: string) {
  const routes = [applicationSelectionRoute()];
  if (!applicationId) return routes;

  const navigation = navigations.find(item => item.application.id === applicationId);
  if (applicationEntryDecision(navigation).status === 'ready' && navigation) {
    routes.push(...navigationToRoutes(navigation));
  }

  return routes;
}

export type MenuPermissionScope = 'tenant' | 'platform';

export function normalizeMenuPermissionScope(value: unknown): MenuPermissionScope {
  return value === 'platform' ? 'platform' : 'tenant';
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
