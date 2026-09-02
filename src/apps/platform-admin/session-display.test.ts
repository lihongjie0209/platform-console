import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionUserLabel } from './session-display';

test('session labels use the identity snapshot returned by the session API', () => {
  assert.equal(
    sessionUserLabel({ user_id: 'user-1', username: 'alice', user_display_name: 'Alice Zhang' }, 'stale catalog'),
    'Alice Zhang (alice)'
  );
  assert.equal(sessionUserLabel({ user_id: 'user-1', username: 'alice' }), 'alice (alice)');
});

test('legacy session responses fall back without requiring a complete user catalog', () => {
  assert.equal(sessionUserLabel({ user_id: 'user-1' }, 'Known User'), 'Known User');
  assert.equal(sessionUserLabel({ user_id: 'user-1' }), 'user-1');
});
