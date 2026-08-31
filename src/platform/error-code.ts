export const PlatformErrorCode = {
  ok: 0,
  invalidArgument: 10001,
  notFound: 10004,
  requestTimeout: 10008,
  tooManyRequests: 10029,
  unauthorized: 20001,
  forbidden: 20003,
  conflict: 30009,
  requestInProgress: 30010,
  staleVersion: 30011,
  lockUnavailable: 30012,
  internal: 50000,
  dependencyUnavailable: 50003
} as const;

export function isAuthenticationFailure(code: number) {
  return code === PlatformErrorCode.unauthorized;
}
