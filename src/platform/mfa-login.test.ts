import assert from 'node:assert/strict';
import test from 'node:test';
import { loginTokenFromResult, mfaChallengeFromLogin } from './mfa-login';

test('extracts only a complete mfa challenge', () => {
  assert.deepEqual(
    mfaChallengeFromLogin({
      mfa_required: true,
      mfa_challenge_token: 'challenge',
      mfa_challenge_expires_at: '2026-09-02T10:00:00Z'
    }),
    { token: 'challenge', expiresAt: '2026-09-02T10:00:00Z' }
  );
  assert.equal(mfaChallengeFromLogin({ mfa_required: true }), null);
  assert.equal(mfaChallengeFromLogin({ mfa_required: false }), null);
});

test('accepts only a complete token response after mfa', () => {
  const token = {
    mfa_required: false,
    access_token: 'access',
    refresh_token: 'refresh',
    expires_at: '2026-09-02T10:00:00Z',
    session_id: 'session-1'
  };
  assert.deepEqual(loginTokenFromResult(token), {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_at: '2026-09-02T10:00:00Z',
    session_id: 'session-1'
  });
  assert.equal(loginTokenFromResult({ mfa_required: false, access_token: 'partial' }), null);
  assert.equal(loginTokenFromResult({ ...token, mfa_required: true }), null);
});
