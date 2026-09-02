import { platformRequest } from '../request';

const identityRequest = platformRequest('identity');

/**
 * Login
 *
 * @param userName User name
 * @param password Password
 */
export function fetchLogin(login: string, password: string) {
  return identityRequest<Api.Auth.LoginResult>({
    url: '/api/v1/auth/login',
    method: 'post',
    data: {
      login,
      password
    }
  });
}

/** Complete an in-memory MFA login challenge. */
export function fetchVerifyMFAChallenge(challengeToken: string, code: string, recoveryCode: string) {
  return identityRequest<Api.Auth.LoginResult>({
    url: '/api/v1/auth/mfa/verify',
    method: 'post',
    data: {
      challenge_token: challengeToken,
      code,
      recovery_code: recoveryCode
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

/** Get MFA enrollment status for the current user. */
export function fetchMFAStatus() {
  return identityRequest<Api.Auth.MFAStatus>({ url: '/api/v1/auth/mfa/status', method: 'post' });
}

/** Start MFA setup after current-password verification. */
export function fetchStartMFASetup(currentPassword: string) {
  return identityRequest<Api.Auth.MFASetup>({
    url: '/api/v1/auth/mfa/setup/start',
    method: 'post',
    data: { current_password: currentPassword }
  });
}

/** Confirm MFA setup with the first TOTP code. */
export function fetchConfirmMFASetup(code: string, version: number) {
  return identityRequest<Api.Auth.MFAConfirmation>({
    url: '/api/v1/auth/mfa/setup/confirm',
    method: 'post',
    data: { code, version }
  });
}

/** Replace all recovery codes after password and fresh-TOTP verification. */
export function fetchRegenerateMFARecoveryCodes(currentPassword: string, code: string, version: number) {
  return identityRequest<Api.Auth.MFARecoveryRotation>({
    url: '/api/v1/auth/mfa/recovery-codes/regenerate',
    method: 'post',
    data: { current_password: currentPassword, code, version }
  });
}

/** Disable MFA after password and TOTP verification. */
export function fetchDisableMFA(currentPassword: string, code: string, version: number) {
  return identityRequest<Api.Auth.MFADisableResult>({
    url: '/api/v1/auth/mfa/disable',
    method: 'post',
    data: { current_password: currentPassword, code, version }
  });
}

/** Consume an administrator-issued one-time password recovery token. */
export function fetchConfirmPasswordReset(resetToken: string, newPassword: string) {
  return identityRequest<Api.Auth.PasswordResetResult>({
    url: '/api/v1/auth/password-reset/confirm',
    method: 'post',
    data: { reset_token: resetToken, new_password: newPassword }
  });
}
