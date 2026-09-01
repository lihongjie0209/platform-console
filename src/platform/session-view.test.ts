import assert from 'node:assert/strict';
import test from 'node:test';
import { canRevokeSession, isCurrentSession } from './session-view';

test('identifies the current session', () => {
  assert.equal(isCurrentSession({ session_id: 'session-1', status: 'active' }, 'session-1'), true);
  assert.equal(isCurrentSession({ session_id: 'session-2', status: 'active' }, 'session-1'), false);
  assert.equal(isCurrentSession({ session_id: '', status: 'active' }, ''), false);
});

test('only allows revoking another active session', () => {
  assert.equal(canRevokeSession({ session_id: 'session-2', status: 'active' }, 'session-1'), true);
  assert.equal(canRevokeSession({ session_id: 'session-1', status: 'active' }, 'session-1'), false);
  assert.equal(canRevokeSession({ session_id: 'session-2', status: 'revoked' }, 'session-1'), false);
  assert.equal(canRevokeSession({ session_id: 'session-2', status: 'expired' }, 'session-1'), false);
});
