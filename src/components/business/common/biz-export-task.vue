<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import BizActionButton from './biz-action-button.vue';
import type { BizExportTaskResult } from './biz-export-task';
import { isBizExportTaskFinished } from './biz-export-task';

defineOptions({ name: 'BizExportTask' });

interface Props {
  create: () => Promise<BizExportTaskResult>;
  query?: (id: string) => Promise<BizExportTaskResult>;
  pollInterval?: number;
  text?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  query: undefined,
  pollInterval: 1000,
  text: '导出',
  disabled: false
});
const emit = defineEmits<{
  created: [task: BizExportTaskResult];
  completed: [task: BizExportTaskResult];
  failed: [task: BizExportTaskResult];
}>();
const timer = ref<ReturnType<typeof setTimeout>>();

function clearTimer() {
  if (timer.value) clearTimeout(timer.value);
  timer.value = undefined;
}

function finish(task: BizExportTaskResult) {
  clearTimer();
  if (task.status === 'success') {
    if (task.downloadUrl) window.open(task.downloadUrl, '_blank', 'noopener,noreferrer');
    emit('completed', task);
  } else {
    window.$message?.error(task.message || '导出失败');
    emit('failed', task);
  }
}

async function poll(id: string) {
  if (!props.query) return;
  const task = await props.query(id);
  if (isBizExportTaskFinished(task)) {
    finish(task);
    return;
  }
  timer.value = setTimeout(() => poll(id), props.pollInterval);
}

async function createTask() {
  const task = await props.create();
  emit('created', task);
  if (isBizExportTaskFinished(task)) finish(task);
  else await poll(task.id);
  return task;
}

onBeforeUnmount(clearTimer);
</script>

<template>
  <BizActionButton :action="createTask" :label="text" :disabled="disabled" @error="clearTimer" />
</template>
