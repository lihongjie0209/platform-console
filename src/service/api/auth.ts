import { platformRequest } from '../request';

const identityRequest = platformRequest('identity');

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(login: string, password: string) {
  return identityRequest<Api.Auth.LoginToken>({
    url: '/api/v1/auth/login',
    method: 'post',
    data: {
      login,
      password
    }
  });
}

/** Get user info */
export function fetchGetUserInfo() {
  return identityRequest<Api.Auth.UserInfo>({ url: '/api/v1/me', method: 'post' });
}

/**
 * Refresh token
 *
 * @param refreshToken Refresh token
 */
export function fetchRefreshToken(refreshToken: string) {
  return identityRequest<Api.Auth.LoginToken>({
    url: '/api/v1/auth/refresh',
    method: 'post',
    data: {
      refresh_token: refreshToken
    }
  });
}

/** Change the current user's password and revoke every other active session. */
export function fetchChangePassword(currentPassword: string, newPassword: string) {
  return identityRequest<Api.Auth.ChangePasswordResult>({
    url: '/api/v1/auth/change-password',
    method: 'post',
    data: {
      current_password: currentPassword,
      new_password: newPassword
    }
  });
}

/** Revoke the current server-side session. */
export function fetchLogout(sessionID: string) {
  return identityRequest<Api.Auth.LogoutResult>({
    url: '/api/v1/auth/logout',
    method: 'post',
    data: {
      session_id: sessionID,
      reason: 'user logout'
    }
  });
}

/** List sessions owned by the current authenticated user. */
export function fetchOwnSessions(status: string, page: number, pageSize: number) {
  return identityRequest<Api.Auth.SessionPage>({
    url: '/api/v1/auth/sessions/list',
    method: 'post',
    data: {
      status,
      page,
      page_size: pageSize
    }
  });
}

/** Revoke a non-current session owned by the current authenticated user. */
export function fetchRevokeOwnSession(sessionID: string, version: number) {
  return identityRequest<Api.Auth.Session>({
    url: '/api/v1/auth/sessions/revoke',
    method: 'post',
    data: {
      session_id: sessionID,
      reason: 'user security revocation',
      version
    }
  });
}
