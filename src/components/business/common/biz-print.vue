<script setup lang="ts">
import printJS from 'print-js';

defineOptions({ name: 'BizPrint' });

interface Props {
  printable: string | Record<string, any>[];
  type?: 'pdf' | 'html' | 'image' | 'json';
  properties?: string[];
  header?: string;
  disabled?: boolean;
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'html',
  properties: () => [],
  header: '',
  disabled: false,
  text: '打印'
});
const emit = defineEmits<{ printed: []; error: [error: unknown] }>();

function print() {
  try {
    printJS({
      printable: props.printable as any,
      type: props.type,
      properties: props.type === 'json' ? props.properties : undefined,
      header: props.header || undefined
    });
    emit('printed');
  } catch (error) {
    emit('error', error);
  }
}
</script>

<template>
  <ElButton :disabled="disabled" @click="print">
    <template #icon><icon-mdi-printer /></template>
    <slot>{{ text }}</slot>
  </ElButton>
</template>
