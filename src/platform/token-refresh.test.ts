import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticationFailureAction, claimAuthenticationRetry, createTokenRefreshCoordinator } from './token-refresh';

test('createTokenRefreshCoordinator shares only an in-flight refresh', async () => {
  let calls = 0;
  let release: ((value: boolean) => void) | undefined;
  const coordinator = createTokenRefreshCoordinator(
    () =>
      new Promise<boolean>(resolve => {
        calls += 1;
        release = resolve;
      })
  );
  const first = coordinator();
  const second = coordinator();
  assert.equal(calls, 1);
  release?.(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  const third = coordinator();
  assert.equal(calls, 2);
  release?.(false);
  assert.equal(await third, false);
});

test('createTokenRefreshCoordinator clears a rejected refresh', async () => {
  let calls = 0;
  const coordinator = createTokenRefreshCoordinator(async () => {
    calls += 1;
    if (calls === 1) throw new Error('refresh failed');
    return true;
  });
  await assert.rejects(coordinator(), /refresh failed/);
  assert.equal(await coordinator(), true);
  assert.equal(calls, 2);
});

test('claimAuthenticationRetry permits one retry per request config', () => {
  const state = {};
  assert.equal(claimAuthenticationRetry(state), true);
  assert.equal(claimAuthenticationRetry(state), false);
});

test('authenticationFailureAction ignores refresh failures and resets after a rejected replay', () => {
  assert.equal(authenticationFailureAction({}, true), 'ignore');
  const state = {};
  assert.equal(authenticationFailureAction(state, false), 'refresh');
  assert.equal(authenticationFailureAction(state, false), 'reset');
});
