import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUserInfo } from './user-profile';

test('normalizeUserInfo clears fields omitted by a newer identity snapshot', () => {
  const normalized = normalizeUserInfo({ subject: 'user-1', username: 'alice' });
  assert.equal(normalized.subject, 'user-1');
  assert.equal(normalized.username, 'alice');
  assert.equal(normalized.tenant_id, '');
  assert.equal(normalized.membership_id, '');
  assert.deepEqual(normalized.roles, []);
  assert.deepEqual(normalized.buttons, []);
});

test('normalizeUserInfo copies authorization arrays', () => {
  const roles = ['admin'];
  const buttons = ['save'];
  const normalized = normalizeUserInfo({ roles, buttons });
  roles.push('mutated');
  buttons.push('mutated');
  assert.deepEqual(normalized.roles, ['admin']);
  assert.deepEqual(normalized.buttons, ['save']);
});
