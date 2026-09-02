import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplicationLoadFailure } from './application-load-events';

test('application load telemetry contains safe routing context without error messages', () => {
  const failure = createApplicationLoadFailure({
    context: { applicationCode: 'billing-center', resourceKey: 'billing-center.invoices', kind: 'page' },
    error: new TypeError('signed URL and internal details'),
    attempts: 1,
    retrying: true
  });

  assert.deepEqual(failure, {
    applicationCode: 'billing-center',
    resourceKey: 'billing-center.invoices',
    kind: 'page',
    errorType: 'TypeError',
    attempts: 1,
    retrying: true,
    consoleVersion: 'dev',
    gitCommit: 'unknown',
    buildTime: ''
  });
  assert.equal(JSON.stringify(failure).includes('internal details'), false);
});
