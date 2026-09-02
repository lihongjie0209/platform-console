import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationCodeError, parseJSONObject, parseJSONRecord } from '../apps/platform-admin/metadata';

test('parseJSONObject accepts metadata objects without double encoding', () => {
  assert.deepEqual(parseJSONObject('{"owner":"platform"}'), { owner: 'platform' });
  assert.deepEqual(parseJSONObject(''), {});
});

test('parseJSONObject rejects non-object metadata', () => {
  assert.throws(() => parseJSONObject('[]'), /must be a JSON object/);
  assert.throws(() => parseJSONObject('"{}"'), /must be a JSON object/);
  assert.throws(() => parseJSONObject('{'), SyntaxError);
});

test('parseJSONRecord identifies the configured transport field', () => {
  assert.throws(() => parseJSONRecord('[]', 'entitlements_json'), /entitlements_json must be a JSON object/);
});

test('application codes preserve a unique URL namespace', () => {
  assert.equal(applicationCodeError('billing-center'), '');
  assert.equal(applicationCodeError(' Billing-Center '), '');
  assert.match(applicationCodeError('billing.center'), /应用编码/);
  assert.match(applicationCodeError('billing_center'), /应用编码/);
  assert.match(applicationCodeError('billing--center'), /应用编码/);
  assert.match(applicationCodeError('billing-center-'), /应用编码/);
});
