import type { ComputedRef } from 'vue';
import { computed, watch } from 'vue';
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';

export function taskPollingEnabled(scopeReady: boolean, hasActiveTasks: boolean, visibility: DocumentVisibilityState) {
  return scopeReady && hasActiveTasks && visibility === 'visible';
}

export function useTaskPolling(enabled: ComputedRef<boolean>, refresh: () => Promise<void>, interval = 5000) {
  const visibility = useDocumentVisibility();
  const active = computed(() => taskPollingEnabled(enabled.value, true, visibility.value));
  let inFlight = false;
  async function poll() {
    if (inFlight) return;
    inFlight = true;
    try {
      await refresh();
    } catch {
      // A background refresh keeps the last successful page; the next tick retries.
    } finally {
      inFlight = false;
    }
  }
  const { pause, resume } = useIntervalFn(poll, interval, { immediate: false });
  watch(
    active,
    value => {
      if (value) resume();
      else pause();
    },
    { immediate: true }
  );
}
