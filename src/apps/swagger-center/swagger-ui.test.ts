import assert from 'node:assert/strict';
import test from 'node:test';
import { injectSwaggerAuthorization, swaggerUIAssetURLs } from './swagger-ui-model';

test('Swagger UI assets are loaded only from the configured swagger service origin', () => {
  assert.deepEqual(swaggerUIAssetURLs('https://swagger.dev.example.com/base'), {
    stylesheet: 'https://swagger.dev.example.com/swagger-assets/swagger-ui.css',
    bundle: 'https://swagger.dev.example.com/swagger-assets/swagger-ui-bundle.js',
    preset: 'https://swagger.dev.example.com/swagger-assets/swagger-ui-standalone-preset.js'
  });
});

test('Swagger try-it-out requests reuse the current console authorization', () => {
  assert.deepEqual(injectSwaggerAuthorization({ Accept: 'application/json' }, 'Bearer token'), {
    Accept: 'application/json',
    Authorization: 'Bearer token'
  });
  assert.deepEqual(injectSwaggerAuthorization({}, null), {});
});
