import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationGrantChanged, applicationGrantExpectedVersion } from './application-grant';

test('grant updates retain the version loaded when the form opened', () => {
  assert.equal(applicationGrantExpectedVersion({ version: 7 }), 7);
  assert.equal(applicationGrantExpectedVersion(), 0);
});

test('grant revocation rejects version or state drift', () => {
  const snapshot = { status: 'active', version: 7 };
  assert.equal(applicationGrantChanged(snapshot, { status: 'active', version: 7 }), false);
  assert.equal(applicationGrantChanged(snapshot, { status: 'active', version: 8 }), true);
  assert.equal(applicationGrantChanged(snapshot, { status: 'revoked', version: 7 }), true);
});
