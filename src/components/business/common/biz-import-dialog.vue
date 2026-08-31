<script setup lang="ts">
import { ref } from 'vue';
import type { UploadFile, UploadUserFile } from 'element-plus';
import BizAsyncDialog from './biz-async-dialog.vue';
import BizFileUpload from './biz-file-upload.vue';

defineOptions({ name: 'BizImportDialog' });

interface Props {
  title?: string;
  accept?: string;
  maxSizeMb?: number;
  templateUrl?: string;
  templateText?: string;
  importFile: (file: File) => Promise<unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  title: '导入数据',
  accept: '.xlsx,.xls,.csv',
  maxSizeMb: 10,
  templateUrl: '',
  templateText: '下载导入模板'
});
const visible = defineModel<boolean>({ default: false });
const emit = defineEmits<{ success: [result: unknown]; error: [error: unknown] }>();
const files = ref<UploadUserFile[]>([]);
const rawFile = ref<File>();

function selectFile(file: UploadFile) {
  rawFile.value = file.raw;
}

async function submit() {
  if (!rawFile.value) {
    window.$message?.warning('请选择要导入的文件');
    throw new Error('Import file is required');
  }
  return props.importFile(rawFile.value);
}

function reset() {
  files.value = [];
  rawFile.value = undefined;
}
</script>

<template>
  <BizAsyncDialog
    v-model="visible"
    :title="title"
    :submit="submit"
    @success="
      result => {
        emit('success', result);
        reset();
      }
    "
    @error="emit('error', $event)"
    @closed="reset"
  >
    <ElAlert type="info" :closable="false" show-icon>
      <template #title>请选择文件后导入，支持 {{ accept }} 格式。</template>
    </ElAlert>
    <div class="mt-16px">
      <BizFileUpload v-model="files" :accept="accept" :max-size-mb="maxSizeMb" @change="selectFile" />
    </div>
    <ElLink
      v-if="templateUrl"
      :href="templateUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-12px"
      type="primary"
    >
      {{ templateText }}
    </ElLink>
  </BizAsyncDialog>
</template>
