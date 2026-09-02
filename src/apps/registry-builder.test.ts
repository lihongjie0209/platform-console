import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApplicationPageLoader } from './types';
import { createApplicationRegistry } from './registry-builder';

const loader = (() => Promise.resolve({ default: {} })) as ApplicationPageLoader;

test('application registry rejects duplicate application codes', () => {
  assert.throws(
    () =>
      createApplicationRegistry([
        { code: 'orders', name: 'Orders', pages: { 'orders.list': loader } },
        { code: 'orders', name: 'Duplicate', pages: { 'orders.detail': loader } }
      ]),
    /Duplicate or empty application code/
  );
});

test('application registry rejects pages outside their application namespace', () => {
  assert.throws(
    () => createApplicationRegistry([{ code: 'orders', name: 'Orders', pages: { 'billing.list': loader } }]),
    /outside application namespace/
  );
});

test('application registry exposes immutable page ownership metadata', () => {
  const registry = createApplicationRegistry([
    { code: 'orders', name: 'Orders', pages: { 'orders.list': loader, 'orders.detail': loader } }
  ]);

  assert.deepEqual(registry.modules, [{ code: 'orders', name: 'Orders', pages: ['orders.list', 'orders.detail'] }]);
  assert.equal(registry.pageLoaders.get('orders.list'), loader);
  assert.equal(Object.isFrozen(registry.modules), true);
  assert.equal(Object.isFrozen(registry.modules[0]?.pages), true);
});
