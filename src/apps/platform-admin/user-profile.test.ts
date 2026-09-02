import assert from 'node:assert/strict';
import test from 'node:test';
import { createUserProfileForm, normalizeUserProfileForm } from './user-profile';

test('user profile editor copies only mutable profile fields and clears the audit reason', () => {
  assert.deepEqual(
    createUserProfileForm({
      display_name: 'Alice',
      email: 'alice@example.com',
      phone: '13800000000',
      username: 'immutable',
      status: 'locked',
      version: 12
    }),
    {
      display_name: 'Alice',
      email: 'alice@example.com',
      phone: '13800000000',
      reason: ''
    }
  );
});

test('user profile update normalizes text before crossing the API boundary', () => {
  assert.deepEqual(
    normalizeUserProfileForm({
      display_name: ' Alice Zhang ',
      email: ' ALICE.ZHANG@EXAMPLE.COM ',
      phone: ' 13800000000 ',
      reason: ' verified by support '
    }),
    {
      display_name: 'Alice Zhang',
      email: 'alice.zhang@example.com',
      phone: '13800000000',
      reason: 'verified by support'
    }
  );
});
