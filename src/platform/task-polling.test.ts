import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldReportTaskLoadError, taskPollingEnabled } from './task-polling';

test('task polling requires scope, active work and a visible document', () => {
  assert.equal(taskPollingEnabled(true, true, 'visible'), true);
  assert.equal(taskPollingEnabled(false, true, 'visible'), false);
  assert.equal(taskPollingEnabled(true, false, 'visible'), false);
  assert.equal(taskPollingEnabled(true, true, 'hidden'), false);
});

test('only current foreground task loads report errors to users', () => {
  assert.equal(shouldReportTaskLoadError(true, false), true);
  assert.equal(shouldReportTaskLoadError(true, true), false);
  assert.equal(shouldReportTaskLoadError(false, false), false);
});
