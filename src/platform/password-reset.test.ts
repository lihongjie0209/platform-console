import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPasswordResetURL, passwordResetTokenFromLocation } from './password-reset';

test('password reset links keep the one-time token out of the server request URL', () => {
  const url = new URL(buildPasswordResetURL('https://console.example.com', 'secret+/='));

  assert.equal(url.pathname, '/login/reset-pwd');
  assert.equal(url.search, '');
  assert.equal(passwordResetTokenFromLocation(url.hash, undefined), 'secret+/=');
});

test('fragment tokens take precedence while query tokens remain backward compatible', () => {
  assert.equal(passwordResetTokenFromLocation('#token=current', 'legacy'), 'current');
  assert.equal(passwordResetTokenFromLocation('', 'legacy'), 'legacy');
  assert.equal(passwordResetTokenFromLocation('', ['invalid']), '');
});
