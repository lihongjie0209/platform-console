import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJSONObject } from '../apps/platform-admin/metadata';

test('parseJSONObject accepts metadata objects without double encoding', () => {
  assert.deepEqual(parseJSONObject('{"owner":"platform"}'), { owner: 'platform' });
  assert.deepEqual(parseJSONObject(''), {});
});

test('parseJSONObject rejects non-object metadata', () => {
  assert.throws(() => parseJSONObject('[]'), /must be a JSON object/);
  assert.throws(() => parseJSONObject('"{}"'), /must be a JSON object/);
  assert.throws(() => parseJSONObject('{'), SyntaxError);
});
