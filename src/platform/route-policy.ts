const publicShellRouteNames = new Set(['403', '404', '500', 'login']);

/** Only authentication and error pages may be mounted before the user session is initialized. */
export function isPublicShellRoute(name: string) {
  return publicShellRouteNames.has(name);
}

export type ShellRouteDisposition = 'constant' | 'authenticated' | 'omit';

export function shellRouteDisposition(name: string, constant: boolean): ShellRouteDisposition {
  if (!constant) return 'authenticated';
  return isPublicShellRoute(name) ? 'constant' : 'omit';
}
