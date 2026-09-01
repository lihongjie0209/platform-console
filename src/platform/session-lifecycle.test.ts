import assert from 'node:assert/strict';
import test from 'node:test';
import { revokeCurrentSession } from './session-lifecycle';

test('revokeCurrentSession revokes before clearing local credentials', async () => {
  const calls: string[] = [];
  const revoked = await revokeCurrentSession(
    'session-1',
    async sessionID => {
      calls.push(`revoke:${sessionID}`);
      return true;
    },
    async () => {
      calls.push('clear');
    }
  );
  assert.equal(revoked, true);
  assert.deepEqual(calls, ['revoke:session-1', 'clear']);
});

test('revokeCurrentSession always clears local credentials when revocation fails', async () => {
  let cleared = false;
  const revoked = await revokeCurrentSession(
    'session-1',
    async () => {
      throw new Error('network unavailable');
    },
    async () => {
      cleared = true;
    }
  );
  assert.equal(revoked, false);
  assert.equal(cleared, true);
});

test('revokeCurrentSession skips the server call when the session id is unavailable', async () => {
  let revokeCalls = 0;
  let cleared = false;
  const revoked = await revokeCurrentSession(
    '',
    async () => {
      revokeCalls += 1;
      return true;
    },
    async () => {
      cleared = true;
    }
  );
  assert.equal(revoked, true);
  assert.equal(revokeCalls, 0);
  assert.equal(cleared, true);
});
