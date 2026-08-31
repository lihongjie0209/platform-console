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
