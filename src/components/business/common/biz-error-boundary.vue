<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue';

defineOptions({ name: 'BizErrorBoundary' });

interface Props {
  resetKey?: string | number;
  message?: string;
}

const props = withDefaults(defineProps<Props>(), { resetKey: undefined, message: '内容加载失败，请重试' });
const emit = defineEmits<{ error: [error: unknown]; retry: [] }>();
const error = ref<unknown>();

onErrorCaptured(capturedError => {
  error.value = capturedError;
  emit('error', capturedError);
  return false;
});

function retry() {
  error.value = undefined;
  emit('retry');
}

watch(() => props.resetKey, retry);
</script>

<template>
  <slot v-if="!error" />
  <slot v-else name="fallback" :error="error" :retry="retry">
    <BizEmptyState :description="message">
      <template #action><ElButton type="primary" @click="retry">重试</ElButton></template>
    </BizEmptyState>
  </slot>
</template>
