import { readonly, ref } from 'vue';

export function useKeyedAsyncAction() {
  const active = ref('');

  async function run<Result>(key: string, action: () => Promise<Result>) {
    if (!key || active.value) return undefined;
    active.value = key;
    try {
      return await action();
    } finally {
      if (active.value === key) active.value = '';
    }
  }

  function reset() {
    active.value = '';
  }

  return { active: readonly(active), run, reset };
}
