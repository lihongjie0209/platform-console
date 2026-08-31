import { ref } from 'vue';

export function useAsyncAction<Result = void>() {
  const loading = ref(false);

  async function run(action: () => Promise<Result>) {
    if (loading.value) return undefined;

    loading.value = true;
    try {
      return await action();
    } finally {
      loading.value = false;
    }
  }

  return { loading, run };
}
