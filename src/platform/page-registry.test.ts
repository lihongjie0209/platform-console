import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationModules, isApplicationPageKey, resolveApplicationPage } from '../apps/registry';

test('application pages are registered under an application namespace', () => {
  assert.deepEqual(
    applicationModules.map(item => item.code),
    ['platform-admin', 'audit-center', 'config-center', 'notification-center', 'file-center', 'scheduler-center']
  );
  assert.equal(isApplicationPageKey('platform-admin.applications'), true);
  assert.equal(isApplicationPageKey('platform-admin.users'), true);
  assert.equal(isApplicationPageKey('platform-admin.tenants'), true);
  assert.equal(isApplicationPageKey('platform-admin.organization-units'), true);
  assert.equal(isApplicationPageKey('platform-admin.memberships'), true);
  assert.equal(isApplicationPageKey('platform-admin.invitations'), true);
  assert.equal(isApplicationPageKey('platform-admin.quotas'), true);
  assert.equal(isApplicationPageKey('platform-admin.group-members'), true);
  assert.equal(isApplicationPageKey('platform-admin.role-bindings'), true);
  assert.equal(isApplicationPageKey('platform-admin.service-accounts'), true);
  assert.equal(isApplicationPageKey('platform-admin.sessions'), true);
  assert.equal(isApplicationPageKey('platform-admin.role-permissions'), true);
  assert.equal(isApplicationPageKey('audit-center.records'), true);
  assert.equal(isApplicationPageKey('config-center.entries'), true);
  assert.equal(isApplicationPageKey('notification-center.templates'), true);
  assert.equal(isApplicationPageKey('notification-center.deliveries'), true);
  assert.equal(isApplicationPageKey('file-center.files'), true);
  assert.equal(isApplicationPageKey('scheduler-center.jobs'), true);
  assert.equal(isApplicationPageKey('application-service.applications'), false);
});

test('page registry rejects untrusted component strings', () => {
  assert.ok(resolveApplicationPage('platform-admin.roles'));
  assert.equal(resolveApplicationPage('../../views/manage/user'), undefined);
  assert.equal(resolveApplicationPage('https://example.com/page.js'), undefined);
});
