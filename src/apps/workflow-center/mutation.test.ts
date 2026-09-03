import assert from 'node:assert/strict';
import test from 'node:test';
import { isTaskActionable } from './mutation';

test('only unfinished workflow tasks accept user mutations', () => {
  assert.equal(isTaskActionable('pending'), true);
  assert.equal(isTaskActionable('claimed'), true);
  assert.equal(isTaskActionable('completed'), false);
  assert.equal(isTaskActionable('cancelled'), false);
});
