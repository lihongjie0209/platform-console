import assert from 'node:assert/strict';
import test from 'node:test';
import { formatConsoleBuild } from './build-info';

test('frontend build identity keeps a short source revision', () => {
  assert.equal(
    formatConsoleBuild({ version: '1.4.0', gitCommit: '0123456789abcdef', buildTime: '2026-09-03T12:00:00+08:00' }),
    'v1.4.0 (0123456789ab)'
  );
});
