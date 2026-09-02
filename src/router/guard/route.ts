import type { LocationQueryRaw, RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router';
import type { RouteKey, RoutePath } from '@elegant-router/types';
import { useAuthStore } from '@/store/modules/auth';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import { localStg } from '@/utils/storage';
import { getRouteName } from '@/router/elegant/transform';
import { runnableApplicationIDForPath } from '@/platform/navigation';

/**
 * create route guard
 *
 * @param router router instance
 */
export function createRouteGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const location = await initRoute(to);

    if (location) {
      return location;
    }

    const authStore = useAuthStore();

    const rootRoute: RouteKey = 'root';
    const loginRoute: RouteKey = 'login';
    const noAuthorizationRoute: RouteKey = '403';

    const isLogin = Boolean(localStg.get('token'));
    const needLogin = !to.meta.constant;
    const routeRoles = to.meta.roles || [];

    const hasRole = authStore.userInfo.roles.some(role => routeRoles.includes(role));
    const hasAuth = authStore.isStaticSuper || !routeRoles.length || hasRole;

    // if it is login route when logged in, then switch to the root page
    if (to.name === loginRoute && isLogin) {
      return { name: rootRoute };
    }

    // if the route does not need login, then it is allowed to access directly
    if (!needLogin) {
      return handleRouteSwitch(to, from);
    }

    // the route need login but the user is not logged in, then switch to the login page
    if (!isLogin) {
      return { name: loginRoute, query: { redirect: to.fullPath } };
    }

    // if the user is logged in but does not have authorization, then switch to the 403 page
    if (!hasAuth) {
      return { name: noAuthorizationRoute };
    }

    const applicationLocation = synchronizeApplicationContext(to);
    if (applicationLocation) {
      return applicationLocation;
    }

    // switch route normally
    return handleRouteSwitch(to, from);
  });
  router.afterEach((to, _from, failure) => {
    const applicationId = to.meta.applicationId;
    if (!failure && applicationId) usePlatformStore().rememberApplicationPath(applicationId, to.path);
  });
}

function synchronizeApplicationContext(to: RouteLocationNormalized): RouteLocationRaw | undefined {
  const applicationId = to.meta.applicationId;
  if (!applicationId) return undefined;

  const platformStore = usePlatformStore();
  if (platformStore.selectedApplicationId === applicationId) return undefined;

  try {
    platformStore.selectApplication(applicationId);
    return undefined;
  } catch {
    return { name: 'applications' };
  }
}

/**
 * initialize route
 *
 * @param to to route
 */
async function initRoute(to: RouteLocationNormalized): Promise<RouteLocationRaw | undefined> {
  const routeStore = useRouteStore();

  const notFoundRoute: RouteKey = 'not-found';
  const isNotFoundRoute = to.name === notFoundRoute;

  // if the constant route is not initialized, then initialize the constant route
  if (!routeStore.isInitConstantRoute) {
    await routeStore.initConstantRoute();

    // the route is captured by the "not-found" route because the constant route is not initialized
    // after the constant route is initialized, redirect to the original route
    const path = to.fullPath;
    const location: RouteLocationRaw = {
      path,
      replace: true,
      query: to.query,
      hash: to.hash
    };

    return location;
  }

  const isLogin = Boolean(localStg.get('token'));

  if (!isLogin) {
    // if the user is not logged in and the route is a constant route but not the "not-found" route, then it is allowed to access.
    if (to.meta.constant && !isNotFoundRoute) {
      routeStore.onRouteSwitchWhenNotLoggedIn();

      return undefined;
    }

    // if the user is not logged in, then switch to the login page
    const loginRoute: RouteKey = 'login';
    const query = getRouteQueryOfLoginRoute(to, routeStore.routeHome);

    const location: RouteLocationRaw = {
      name: loginRoute,
      query
    };

    return location;
  }

  if (!routeStore.isInitAuthRoute) {
    // initialize the auth route
    await routeStore.initAuthRoute();

    // the route is captured by the "not-found" route because the auth route is not initialized
    // after the auth route is initialized, redirect to the original route
    if (isNotFoundRoute) {
      const rootRoute: RouteKey = 'root';
      const path = to.redirectedFrom?.name === rootRoute ? '/' : to.fullPath;

      const location: RouteLocationRaw = {
        path,
        replace: true,
        query: to.query,
        hash: to.hash
      };

      return location;
    }
  }

  routeStore.onRouteSwitchWhenLoggedIn();

  // the auth route is initialized
  // it is not the "not-found" route, then it is allowed to access
  if (!isNotFoundRoute) {
    return undefined;
  }

  const deepLinkLocation = recoverApplicationDeepLink(to, routeStore);
  if (deepLinkLocation) return deepLinkLocation;

  // it is captured by the "not-found" route, then check whether the route exists
  const exist = await routeStore.getIsAuthRouteExist(to.path as RoutePath);
  const noPermissionRoute: RouteKey = '403';

  if (exist) {
    const location: RouteLocationRaw = {
      name: noPermissionRoute
    };

    return location;
  }

  return undefined;
}

function recoverApplicationDeepLink(
  to: RouteLocationNormalized,
  routeStore: Pick<ReturnType<typeof useRouteStore>, 'refreshPlatformRoutes'>
): RouteLocationRaw | undefined {
  const platformStore = usePlatformStore();
  const applicationId = runnableApplicationIDForPath(platformStore.navigations, to.path);
  if (!applicationId || applicationId === platformStore.selectedApplicationId) return undefined;

  try {
    platformStore.selectApplication(applicationId);
    routeStore.refreshPlatformRoutes();
    return { path: to.path, query: to.query, hash: to.hash, replace: true };
  } catch {
    return { name: 'applications' };
  }
}

function handleRouteSwitch(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  // route with href
  if (to.meta.href) {
    window.open(to.meta.href, '_blank');

    return { path: from.fullPath, replace: true, query: from.query, hash: to.hash };
  }
  return undefined;
}

function getRouteQueryOfLoginRoute(to: RouteLocationNormalized, routeHome: RouteKey) {
  const loginRoute: RouteKey = 'login';
  const redirect = to.fullPath;
  const [redirectPath, redirectQuery] = redirect.split('?');
  const redirectName = getRouteName(redirectPath as RoutePath);

  const isRedirectHome = routeHome === redirectName;

  const query: LocationQueryRaw = to.name !== loginRoute && !isRedirectHome ? { redirect } : {};

  if (isRedirectHome && redirectQuery) {
    query.redirect = `/?${redirectQuery}`;
  }

  return query;
}
