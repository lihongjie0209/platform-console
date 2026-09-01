import type { ElegantConstRoute } from '@elegant-router/types';
import type { ApplicationMenu, PlatformApplication, PublishedNavigation } from '@/service/api/platform-navigation';

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
  const children = roots.map(menu => menuRoute(application, menu, menus));

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

export function applicationSelectionRoute(): ElegantConstRoute {
  return {
    name: 'applications',
    path: '/applications',
    component: 'layout.base$view.applications',
    meta: { title: '选择应用', icon: 'mdi:apps', order: -1 }
  } as ElegantConstRoute;
}
