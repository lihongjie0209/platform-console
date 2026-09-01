export function createTokenRefreshCoordinator(refresh: () => Promise<boolean>): () => Promise<boolean> {
  let inFlight: Promise<boolean> | undefined;

  return () => {
    if (!inFlight) {
      inFlight = refresh().finally(() => {
        inFlight = undefined;
      });
    }
    return inFlight;
  };
}

export interface AuthenticationRetryState {
  platformAuthenticationRetried?: boolean;
}

export function claimAuthenticationRetry(state: AuthenticationRetryState): boolean {
  if (state.platformAuthenticationRetried) return false;
  state.platformAuthenticationRetried = true;
  return true;
}

export type AuthenticationFailureAction = 'ignore' | 'refresh' | 'reset';

export function authenticationFailureAction(
  state: AuthenticationRetryState,
  isRefreshEndpoint: boolean
): AuthenticationFailureAction {
  if (isRefreshEndpoint) return 'ignore';
  return claimAuthenticationRetry(state) ? 'refresh' : 'reset';
}
