import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRuntimeConfig } from './runtime-config';

test('parseRuntimeConfig accepts a complete development configuration', () => {
  const config = parseRuntimeConfig({
    environment: 'development',
    services: {
      identity: 'http://identity.dev.example.test',
      tenant: 'http://tenant.dev.example.test',
      authorization: 'http://authorization.dev.example.test',
      application: 'http://application.dev.example.test'
    }
  });

  assert.equal(config.environment, 'development');
});

test('parseRuntimeConfig rejects plaintext production service URLs', () => {
  assert.throws(
    () =>
      parseRuntimeConfig({
        environment: 'production',
        services: {
          identity: 'http://identity.example.test',
          tenant: 'https://tenant.example.test',
          authorization: 'https://authorization.example.test',
          application: 'https://application.example.test'
        }
      }),
    /must use HTTPS/
  );
});
