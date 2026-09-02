import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmUserAction, promptUserInput } from './user-action';

test('confirmUserAction converts confirmation and cancellation to a boolean', async () => {
  assert.equal(await confirmUserAction(async () => undefined), true);
  assert.equal(
    await confirmUserAction(async () => {
      throw new Error('cancel');
    }),
    false
  );
});

test('promptUserInput trims accepted values and ignores cancellation', async () => {
  assert.equal(await promptUserInput(async () => ({ value: '  operator reason  ' })), 'operator reason');
  assert.equal(
    await promptUserInput(async () => {
      throw new Error('cancel');
    }),
    undefined
  );
  assert.equal(await promptUserInput(async () => ({ value: 42 })), undefined);
});
