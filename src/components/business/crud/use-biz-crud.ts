import { reactive, ref, shallowRef, toRaw, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { BizCrudAdapter, BizCrudFormConfig, BizCrudKey } from './types';
import { createBizCrudMutationIntent } from './mutation-intent';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function useBizCrud<Row, Query extends Record<string, any>>(options: {
  createQuery: () => Query;
  list: (query: Query) => Promise<{ items: Row[]; total: number; page: number; pageSize: number }>;
}) {
  const query = reactive<Query>(clone(options.createQuery()));
  const rows = shallowRef<Row[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      const result = await options.list(query as Query);
      rows.value = result.items;
      total.value = result.total;
      return result;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    Object.assign(query, clone(options.createQuery()));
  }

  return { query, rows, total, loading, load, reset };
}

export function useBizCrudForm<Row, Query, Form extends Record<string, any>, Key extends BizCrudKey>(options: {
  form: BizCrudFormConfig<Row, Form, Key>;
  adapter: BizCrudAdapter<Row, Query, Form, Key>;
  recordKey?: MaybeRefOrGetter<Key | null | undefined>;
}) {
  const model = ref<Form>(options.form.createModel());
  const loading = ref(false);
  const submitting = ref(false);
  const mutationIntent = createBizCrudMutationIntent();

  async function initialize(initial?: Partial<Form>) {
    mutationIntent.reset();
    model.value = Object.assign(options.form.createModel(), clone(toRaw(initial || {})));
    const key = toValue(options.recordKey);
    if (key !== null && key !== undefined && options.adapter.detail) {
      loading.value = true;
      try {
        Object.assign(model.value, await options.adapter.detail(key));
      } finally {
        loading.value = false;
      }
    }
  }

  async function submit() {
    if (submitting.value) return;
    submitting.value = true;
    try {
      const key = toValue(options.recordKey);
      const payload = clone(toRaw(model.value));
      if (key === null || key === undefined) {
        await options.adapter.create?.(payload, mutationIntent.context('create', payload));
      } else {
        await options.adapter.update?.(key, payload, mutationIntent.context(`edit:${String(key)}`, payload));
      }
      mutationIntent.reset();
    } finally {
      submitting.value = false;
    }
  }

  return { model, loading, submitting, initialize, submit };
}
