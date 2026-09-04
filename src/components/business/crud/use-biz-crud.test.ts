import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { nextTick, ref } from 'vue';
import { useBizCrud, useBizCrudForm } from './use-biz-crud';
import type { BizCrudAdapter, BizCrudFormConfig, BizCrudMutationContext } from './types';

interface Row {
  id: number;
  name: string;
}

interface Query {
  current: number;
  size: number;
  keyword: string;
}

interface Form {
  name: string;
}

describe('useBizCrud', () => {
  it('loads normalized rows and resets query state', async () => {
    const list = mock.fn(async (query: Query) => ({
      items: [{ id: 1, name: query.keyword }],
      total: 1,
      page: 1,
      pageSize: 10
    }));
    const crud = useBizCrud({ createQuery: () => ({ current: 1, size: 10, keyword: '' }), list });

    crud.query.keyword = 'Soybean';
    await crud.load();

    assert.deepEqual(crud.rows.value, [{ id: 1, name: 'Soybean' }]);
    assert.equal(crud.total.value, 1);
    assert.equal(crud.loading.value, false);

    crud.reset();
    assert.deepEqual(crud.query, { current: 1, size: 10, keyword: '' });
  });

  it('always releases loading when list fails', async () => {
    const crud = useBizCrud<Query, Query>({
      createQuery: () => ({ current: 1, size: 10, keyword: '' }),
      list: async () => {
        throw new Error('network');
      }
    });

    await assert.rejects(crud.load(), /network/);
    assert.equal(crud.loading.value, false);
  });
});

describe('useBizCrudForm', () => {
  const form: BizCrudFormConfig<Row, Form, number> = {
    mode: 'page',
    fields: [{ key: 'name', label: 'Name' }],
    createModel: () => ({ name: '' }),
    createTitle: 'Create',
    editTitle: 'Edit'
  };

  it('loads detail for page edit mode and updates it', async () => {
    const update = mock.fn(async (_id: number, _form: Form, _context: BizCrudMutationContext) => undefined);
    const adapter: BizCrudAdapter<Row, Query, Form, number> = {
      list: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      detail: async id => ({ name: `User ${id}` }),
      update
    };
    const recordKey = ref<number | null>(7);
    const state = useBizCrudForm({ form, adapter, recordKey });

    await state.initialize();
    assert.equal(state.model.value.name, 'User 7');

    state.model.value.name = 'Updated';
    await state.submit();
    assert.equal(update.mock.callCount(), 1);
    const [call] = update.mock.calls;
    assert.ok(call);
    assert.deepEqual(call.arguments.slice(0, 2), [7, { name: 'Updated' }]);
    assert.ok(call.arguments[2].idempotencyKey);
  });

  it('prevents duplicate submissions', async () => {
    let resolve!: () => void;
    const create = mock.fn(
      () =>
        new Promise<void>(done => {
          resolve = done;
        })
    );
    const adapter: BizCrudAdapter<Row, Query, Form, number> = {
      list: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      create
    };
    const state = useBizCrudForm({ form, adapter });

    const first = state.submit();
    await nextTick();
    await state.submit();
    assert.equal(create.mock.callCount(), 1);

    resolve();
    await first;
    assert.equal(state.submitting.value, false);
  });
});
