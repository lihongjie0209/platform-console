<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';

defineOptions({ name: 'BizCopyText' });

interface Props {
  value: string | number | null | undefined;
  display?: string;
  emptyText?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { display: '', emptyText: '--', disabled: false });
const emit = defineEmits<{ copied: [value: string]; error: [] }>();
const { copy, isSupported } = useClipboard();

const text = computed(() =>
  props.value === null || props.value === undefined || props.value === '' ? '' : String(props.value)
);
const label = computed(() => props.display || text.value || props.emptyText);

async function handleCopy() {
  if (!text.value || props.disabled || !isSupported.value) return;
  try {
    await copy(text.value);
    window.$message?.success('已复制');
    emit('copied', text.value);
  } catch {
    emit('error');
  }
}
</script>

<template>
  <ElTooltip :content="isSupported ? '复制' : '当前环境不支持复制'">
    <span class="inline-flex items-center gap-4px">
      <span>{{ label }}</span>
      <ElButton v-if="text" text circle size="small" :disabled="disabled || !isSupported" @click="handleCopy">
        <template #icon><icon-mdi-content-copy /></template>
      </ElButton>
    </span>
  </ElTooltip>
</template>
