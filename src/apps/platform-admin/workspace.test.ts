import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationMenuEntry } from '@/platform/navigation';
import { governanceDomainEntries } from './workspace';

function entry(code: string, available = true): ApplicationMenuEntry {
  return {
    id: code,
    parentID: '',
    code,
    name: code,
    icon: '',
    path: `/apps/platform-admin/${code}`,
    externalURL: '',
    available
  };
}

test('governance domains use only published and executable application pages', () => {
  const domains = governanceDomainEntries([
    entry('users', false),
    entry('sessions'),
    entry('memberships'),
    entry('permissions'),
    entry('applications')
  ]);

  assert.deepEqual(
    domains.map(domain => [domain.code, domain.path]),
    [
      ['identity', '/apps/platform-admin/sessions'],
      ['tenant', '/apps/platform-admin/memberships'],
      ['authorization', '/apps/platform-admin/permissions'],
      ['application', '/apps/platform-admin/applications']
    ]
  );
});

test('governance domains stay disabled when no authorized menu is published', () => {
  assert.deepEqual(
    governanceDomainEntries([]).map(domain => domain.path),
    ['', '', '', '']
  );
});
