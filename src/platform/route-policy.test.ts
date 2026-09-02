import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicShellRoute, shellRouteDisposition } from './route-policy';

test('public shell routes exclude scaffold utilities and authenticated pages', () => {
  for (const route of ['403', '404', '500', 'login']) assert.equal(isPublicShellRoute(route), true);
  for (const route of ['iframe-page', 'home', 'about', 'applications', 'user-center', 'plugin']) {
    assert.equal(isPublicShellRoute(route), false);
  }
});

test('shell route classification omits constant scaffold utilities', () => {
  assert.equal(shellRouteDisposition('login', true), 'constant');
  assert.equal(shellRouteDisposition('iframe-page', true), 'omit');
  assert.equal(shellRouteDisposition('applications', false), 'authenticated');
});
