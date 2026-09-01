import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePasswordChange } from './password-policy';

test('validatePasswordChange accepts a distinct confirmed password', () => {
  assert.equal(validatePasswordChange('current-password', 'different-password', 'different-password'), undefined);
});

test('validatePasswordChange enforces the backend byte-length and confirmation rules', () => {
  assert.equal(validatePasswordChange('', 'different-password', 'different-password'), '请输入当前密码');
  assert.equal(validatePasswordChange('current-password', 'short', 'short'), '新密码长度必须为 12 到 1024 字节');
  assert.equal(
    validatePasswordChange('current-password', 'current-password', 'current-password'),
    '新密码不能与当前密码相同'
  );
  assert.equal(
    validatePasswordChange('current-password', 'different-password', 'another-password'),
    '两次输入的新密码不一致'
  );
  assert.equal(validatePasswordChange('current-password', '密'.repeat(4), '密'.repeat(4)), undefined);
});
