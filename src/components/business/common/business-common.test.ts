import assert from 'node:assert/strict';
import test from 'node:test';
import { findBizDictOption } from './biz-dict';
import { canAddBizDynamicField, canRemoveBizDynamicField } from './biz-dynamic-fields';
import { isBizExportTaskFinished } from './biz-export-task';
import { mergeBizRemoteOptions } from './biz-remote-select';
import { useAsyncAction } from './use-async-action';

test('findBizDictOption matches values without coercion', () => {
  const options = [
    { label: 'enabled', value: 1 },
    { label: 'disabled', value: 2 }
  ];
  assert.equal(findBizDictOption(options, 1)?.label, 'enabled');
  assert.equal(findBizDictOption(options, 3), undefined);
});

test('mergeBizRemoteOptions keeps order and refreshes duplicate values', () => {
  const merged = mergeBizRemoteOptions(
    [{ label: 'old', value: 'admin' }],
    [
      { label: '管理员', value: 'admin' },
      { label: '访客', value: 'guest' }
    ]
  );
  assert.deepEqual(merged, [
    { label: '管理员', value: 'admin' },
    { label: '访客', value: 'guest' }
  ]);
});

test('useAsyncAction prevents duplicate execution and restores loading', async () => {
  const { loading, run } = useAsyncAction<number>();
  let resolve!: (value: number) => void;
  const first = run(
    () =>
      new Promise<number>(done => {
        resolve = done;
      })
  );
  assert.equal(loading.value, true);
  assert.equal(await run(async () => 2), undefined);
  resolve(1);
  assert.equal(await first, 1);
  assert.equal(loading.value, false);
});

test('isBizExportTaskFinished only finishes successful or failed tasks', () => {
  assert.equal(isBizExportTaskFinished({ id: '1', status: 'pending' }), false);
  assert.equal(isBizExportTaskFinished({ id: '1', status: 'processing' }), false);
  assert.equal(isBizExportTaskFinished({ id: '1', status: 'success' }), true);
  assert.equal(isBizExportTaskFinished({ id: '1', status: 'failed' }), true);
});

test('dynamic field limits prevent invalid add and remove operations', () => {
  assert.equal(canAddBizDynamicField(2, 2), false);
  assert.equal(canAddBizDynamicField(1, 2), true);
  assert.equal(canRemoveBizDynamicField(1, 1), false);
  assert.equal(canRemoveBizDynamicField(2, 1), true);
});
