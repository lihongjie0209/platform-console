import assert from 'node:assert/strict';
import test from 'node:test';
import { useKeyedAsyncAction } from './keyed-async-action';

test('keyed actions reject duplicate work and always release their active key', async () => {
  const actions = useKeyedAsyncAction();
  let release!: () => void;
  const pending = actions.run(
    'job-1:retry',
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      })
  );
  assert.equal(actions.active.value, 'job-1:retry');
  assert.equal(await actions.run('job-2:cancel', async () => 'unexpected'), undefined);
  release();
  await pending;
  assert.equal(actions.active.value, '');

  await assert.rejects(
    actions.run('job-1:retry', async () => Promise.reject(new Error('failed'))),
    /failed/
  );
  assert.equal(actions.active.value, '');
});
