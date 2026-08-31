<script setup lang="ts">
import type { UploadFile, UploadFiles, UploadProps, UploadRawFile, UploadUserFile } from 'element-plus';

defineOptions({ name: 'BizFileUpload' });

interface Props {
  action?: string;
  accept?: string;
  limit?: number;
  maxSizeMb?: number;
  multiple?: boolean;
  disabled?: boolean;
  tip?: string;
  headers?: Record<string, string>;
  data?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  action: '',
  accept: '',
  limit: 1,
  maxSizeMb: 10,
  multiple: false,
  disabled: false,
  tip: '',
  headers: () => ({}),
  data: () => ({})
});

const emit = defineEmits<{
  change: [file: UploadFile, files: UploadFiles];
  success: [response: any, file: UploadFile, files: UploadFiles];
  error: [error: Error, file: UploadFile, files: UploadFiles];
}>();

const files = defineModel<UploadUserFile[]>({ default: () => [] });

const beforeUpload: UploadProps['beforeUpload'] = (rawFile: UploadRawFile) => {
  if (rawFile.size <= props.maxSizeMb * 1024 * 1024) return true;
  window.$message?.error(`文件大小不能超过 ${props.maxSizeMb} MB`);
  return false;
};

function handleExceed() {
  window.$message?.warning(`最多上传 ${props.limit} 个文件`);
}
</script>

<template>
  <ElUpload
    v-model:file-list="files"
    :action="action"
    :accept="accept"
    :limit="limit"
    :multiple="multiple"
    :disabled="disabled"
    :headers="headers"
    :data="data"
    :auto-upload="Boolean(action)"
    :before-upload="beforeUpload"
    @change="emit('change', $event, files as UploadFiles)"
    @success="(response, file, list) => emit('success', response, file, list)"
    @error="(error, file, list) => emit('error', error, file, list)"
    @exceed="handleExceed"
  >
    <slot>
      <ElButton type="primary" plain :disabled="disabled">
        <template #icon><icon-ic-round-upload class="text-icon" /></template>
        选择文件
      </ElButton>
    </slot>
    <template v-if="tip || $slots.tip" #tip>
      <div class="mt-6px text-12px text-gray-500">
        <slot name="tip">{{ tip }}</slot>
      </div>
    </template>
  </ElUpload>
</template>
