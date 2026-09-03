import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProviderForm, providerFormError } from './provider-form';

test('provider form normalizes identifiers before submission', () => {
  assert.deepEqual(
    normalizeProviderForm({
      code: ' Mail.Primary ',
      channel: ' EMAIL ',
      upstream: ' mail-primary ',
      path: ' /v1/send ',
      priority: 10,
      status: ' ACTIVE '
    }),
    {
      code: 'mail.primary',
      channel: 'email',
      upstream: 'mail-primary',
      path: '/v1/send',
      priority: 10,
      status: 'active'
    }
  );
});

test('provider form rejects host override paths and invalid priorities', () => {
  const base = { code: 'mail', channel: 'email', upstream: 'mail', path: '/send', priority: 10, status: 'active' };
  assert.match(providerFormError({ ...base, path: '//evil.example/send' }), /路径/);
  assert.match(providerFormError({ ...base, path: 'https://evil.example/send' }), /路径/);
  assert.match(providerFormError({ ...base, priority: -1 }), /优先级/);
  assert.equal(providerFormError(base), '');
});
