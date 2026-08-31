<script setup lang="ts">
import type { UploadFile } from 'element-plus';

defineOptions({ name: 'BizImportExportActions' });

interface Props {
  importAccept?: string;
  importDisabled?: boolean;
  exportDisabled?: boolean;
  exportLoading?: boolean;
  importText?: string;
  exportText?: string;
}

withDefaults(defineProps<Props>(), {
  importAccept: '.xlsx,.xls,.csv',
  importDisabled: false,
  exportDisabled: false,
  exportLoading: false,
  importText: '导入',
  exportText: '导出'
});

const emit = defineEmits<{ import: [file: File]; export: [] }>();

function selectFile(uploadFile: UploadFile) {
  if (uploadFile.raw) emit('import', uploadFile.raw);
}
</script>

<template>
  <ElSpace>
    <ElUpload
      :auto-upload="false"
      :show-file-list="false"
      :accept="importAccept"
      :disabled="importDisabled"
      @change="selectFile"
    >
      <ElButton :disabled="importDisabled">
        <template #icon><icon-ic-round-upload class="text-icon" /></template>
        {{ importText }}
      </ElButton>
    </ElUpload>
    <ElButton :disabled="exportDisabled" :loading="exportLoading" @click="emit('export')">
      <template #icon><icon-ic-round-download class="text-icon" /></template>
      {{ exportText }}
    </ElButton>
    <slot />
  </ElSpace>
</template>
