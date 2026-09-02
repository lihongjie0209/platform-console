import assert from 'node:assert/strict';
import test from 'node:test';
import { taskPollingEnabled } from './task-polling';

test('task polling requires scope, active work and a visible document', () => {
  assert.equal(taskPollingEnabled(true, true, 'visible'), true);
  assert.equal(taskPollingEnabled(false, true, 'visible'), false);
  assert.equal(taskPollingEnabled(true, false, 'visible'), false);
  assert.equal(taskPollingEnabled(true, true, 'hidden'), false);
});
