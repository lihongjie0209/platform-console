import assert from 'node:assert/strict';
import test from 'node:test';
import type { PlatformApplication } from '@/service/api';
import { groupApplications } from './application-groups';

function application(code: string, name = code): PlatformApplication {
  return {
    id: code,
    code,
    name,
    description: '',
    icon: '',
    default_route: '',
    status: 'active'
  };
}

test('groups installed platform applications by product boundary', () => {
  const groups = groupApplications([
    application('billing-center'),
    application('platform-admin'),
    application('workflow-center'),
    application('audit-center')
  ]);

  assert.deepEqual(
    groups.map(group => [group.category, group.applications.map(item => item.code)]),
    [
      ['platform', ['platform-admin']],
      ['operations', ['audit-center']],
      ['automation', ['workflow-center']],
      ['commerce', ['billing-center']]
    ]
  );
});

test('keeps future backend-defined applications visible as business applications', () => {
  const groups = groupApplications([application('crm'), application('erp')]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.label, '业务应用');
  assert.deepEqual(
    groups[0]?.applications.map(item => item.code),
    ['crm', 'erp']
  );
});

test('uses a valid server-managed category and safely ignores malformed metadata', () => {
  const crm = application('crm');
  crm.metadata_json = JSON.stringify({ category: 'commerce' });
  const malformed = application('future-platform');
  malformed.metadata_json = '{';
  const unsupported = application('legacy');
  unsupported.metadata_json = JSON.stringify({ category: 'unknown' });

  const groups = groupApplications([crm, malformed, unsupported]);

  assert.deepEqual(
    groups.map(group => [group.category, group.applications.map(item => item.code)]),
    [
      ['commerce', ['crm']],
      ['business', ['future-platform', 'legacy']]
    ]
  );
});
