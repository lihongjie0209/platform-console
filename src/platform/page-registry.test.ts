import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applicationModules,
  applicationPageOptionsFor,
  isApplicationPageKey,
  pageBelongsToApplication,
  pageUsesApplicationNamespace,
  resolveApplicationPage,
  resolveApplicationWorkspace
} from '../apps/registry';

test('application pages are registered under an application namespace', () => {
  assert.deepEqual(
    applicationModules.map(item => item.code),
    [
      'platform-admin',
      'audit-center',
      'config-center',
      'notification-center',
      'file-center',
      'scheduler-center',
      'dictionary-center',
      'registry-center',
      'swagger-center',
      'workflow-center',
      'search-center',
      'metering-center',
      'billing-center',
      'rule-center',
      'import-center',
      'export-center',
      'webhook-center'
    ]
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
  assert.equal(isApplicationPageKey('dictionary-center.definitions'), true);
  assert.equal(isApplicationPageKey('dictionary-center.providers'), true);
  assert.equal(isApplicationPageKey('registry-center.services'), true);
  assert.equal(isApplicationPageKey('swagger-center.documents'), true);
  assert.equal(isApplicationPageKey('workflow-center.definitions'), true);
  assert.equal(isApplicationPageKey('workflow-center.instances'), true);
  assert.equal(isApplicationPageKey('workflow-center.tasks'), true);
  assert.equal(isApplicationPageKey('search-center.search'), true);
  assert.equal(isApplicationPageKey('metering-center.meters'), true);
  assert.equal(isApplicationPageKey('metering-center.usage'), true);
  assert.equal(isApplicationPageKey('billing-center.plans'), true);
  assert.equal(isApplicationPageKey('billing-center.subscriptions'), true);
  assert.equal(isApplicationPageKey('billing-center.invoices'), true);
  assert.equal(isApplicationPageKey('rule-center.rules'), true);
  assert.equal(isApplicationPageKey('import-center.jobs'), true);
  assert.equal(isApplicationPageKey('export-center.jobs'), true);
  assert.equal(isApplicationPageKey('webhook-center.subscriptions'), true);
  assert.equal(isApplicationPageKey('webhook-center.deliveries'), true);
  assert.equal(isApplicationPageKey('application-service.applications'), false);
});

test('page registry rejects untrusted component strings', () => {
  assert.ok(resolveApplicationPage('platform-admin.roles', 'platform-admin'));
  assert.equal(resolveApplicationPage('../../views/manage/user', 'platform-admin'), undefined);
  assert.equal(resolveApplicationPage('https://example.com/page.js', 'platform-admin'), undefined);
});

test('application workspaces are optional and scoped by manifest code', () => {
  assert.ok(resolveApplicationWorkspace('platform-admin'));
  assert.equal(resolveApplicationWorkspace('billing-center'), undefined);
  assert.equal(resolveApplicationWorkspace('../../platform-admin'), undefined);
});

test('an application cannot mount a page owned by another application', () => {
  assert.equal(pageBelongsToApplication('billing-center.invoices', 'billing-center'), true);
  assert.equal(pageBelongsToApplication('billing-center.invoices', 'platform-admin'), false);
  assert.equal(resolveApplicationPage('billing-center.invoices', 'platform-admin'), undefined);
  assert.equal(resolveApplicationPage('billing-center.invoices'), undefined);
});

test('menu page options are limited to the selected application namespace', () => {
  assert.deepEqual(
    applicationPageOptionsFor('billing-center').map(option => option.value),
    ['billing-center.plans', 'billing-center.subscriptions', 'billing-center.invoices', 'billing-center.payments']
  );
  assert.deepEqual(applicationPageOptionsFor('billing-center', 'billing-center.future').at(-1), {
    value: 'billing-center.future',
    label: 'billing-center.future（当前版本未安装）'
  });
  assert.equal(pageUsesApplicationNamespace('platform-admin.users', 'billing-center'), false);
  assert.equal(applicationPageOptionsFor('', 'billing-center.future').length, 0);
});
