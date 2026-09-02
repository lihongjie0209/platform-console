export function mfaChallengeFromLogin(result: Api.Auth.LoginResult): Api.Auth.MFAChallenge | null {
  if (!result.mfa_required) return null;
  if (!result.mfa_challenge_token || !result.mfa_challenge_expires_at) return null;
  return { token: result.mfa_challenge_token, expiresAt: result.mfa_challenge_expires_at };
}

export function loginTokenFromResult(result: Api.Auth.LoginResult): Api.Auth.LoginToken | null {
  if (result.mfa_required) return null;
  if (!result.access_token || !result.refresh_token || !result.expires_at || !result.session_id) {
    return null;
  }
  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: result.expires_at,
    session_id: result.session_id
  };
}
