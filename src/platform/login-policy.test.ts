import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLoginModule, supportedLoginModules } from './login-policy';

test('login routes expose only contract-backed authentication modules', () => {
  assert.deepEqual(supportedLoginModules, ['pwd-login', 'reset-pwd']);
  assert.equal(normalizeLoginModule('reset-pwd'), 'reset-pwd');
  for (const unsupported of [undefined, 'code-login', 'register', 'bind-wechat', 'unknown']) {
    assert.equal(normalizeLoginModule(unsupported), 'pwd-login');
  }
});
