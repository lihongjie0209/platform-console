<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { sha256Hex } from '@/apps/file-center/checksum';
import type { ImportDataset, ImportJob } from '../../api';
import {
  cancelImport,
  completeImportUpload,
  confirmImport,
  createImport,
  errorReport,
  listDatasets,
  listImports,
  putImportFile,
  retryImport
} from '../../api';
defineOptions({ name: 'ImportCenterJobs' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<ImportJob[]>([]);
const datasets = ref<ImportDataset[]>([]);
const status = ref('');
const datasetCode = ref('');
const selectedDataset = ref('');
const format = ref('csv');
const source = ref<File>();
const uploading = ref(false);
const fileInputKey = ref(0);
let loadVersion = 0;
const uploadGuard = createLatestRequestGuard();
async function load() {
  loadVersion += 1;
  const version = loadVersion;
  if (!scopeReady.value) {
    rows.value = [];
    datasets.value = [];
    return;
  }
  const [v, d] = await Promise.all([
    listImports({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      status: status.value,
      datasetCode: datasetCode.value
    }),
    listDatasets(tenantID.value, applicationID.value, '')
  ]);
  if (version !== loadVersion) return;
  rows.value = v.items || [];
  datasets.value = d.items || [];
}
function chooseFile(e: Event) {
  source.value = (e.target as HTMLInputElement).files?.[0];
}
async function create() {
  if (!scopeReady.value || !source.value) return;
  const request = uploadGuard.begin();
  const selectedFile = source.value;
  const tenant = tenantID.value;
  const application = applicationID.value;
  const dataset = datasets.value.find(v => `${v.provider_service}:${v.code}` === selectedDataset.value);
  if (!dataset) return;
  uploading.value = true;
  try {
    const auth = await createImport({
      tenantID: tenant,
      applicationID: application,
      dataset,
      format: format.value,
      filename: selectedFile.name
    });
    await putImportFile(auth, selectedFile);
    const checksum = await sha256Hex(selectedFile);
    await completeImportUpload(auth.job, selectedFile.size, checksum);
    if (!uploadGuard.isCurrent(request)) return;
    window.$message?.success('文件已上传，正在校验');
    await load();
  } finally {
    if (uploadGuard.isCurrent(request)) uploading.value = false;
  }
}
async function action(job: ImportJob, type: 'confirm' | 'cancel' | 'retry' | 'report') {
  if (type === 'confirm') await confirmImport(job);
  if (type === 'cancel') await cancelImport(job);
  if (type === 'retry') {
    if (!source.value) {
      window.$message?.warning('请先选择修正后的文件');
      return;
    }
    const auth = await retryImport(job);
    await putImportFile(auth, source.value);
    await completeImportUpload(auth.job, source.value.size, await sha256Hex(source.value));
  }
  if (type === 'report') {
    const value = await errorReport(job);
    window.open(value.url, '_blank', 'noopener');
    return;
  }
  await load();
}
watch([tenantID, applicationID], () => {
  uploadGuard.invalidate();
  loadVersion += 1;
  rows.value = [];
  datasets.value = [];
  selectedDataset.value = '';
  source.value = undefined;
  fileInputKey.value += 1;
  uploading.value = false;
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <h2 class="m-0">数据导入</h2>
        <p class="mb-0 text-#999">
          为 {{ applicationName }} 直传文件，后台校验后由用户确认应用；失败任务保留错误报告。
        </p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="数据集">
          <ElSelect v-model="selectedDataset" class="w-260px">
            <ElOption
              v-for="v in datasets"
              :key="`${v.provider_service}:${v.code}`"
              :label="`${v.title} (${v.provider_service})`"
              :value="`${v.provider_service}:${v.code}`"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="格式">
          <ElSelect v-model="format" class="w-110px">
            <ElOption v-for="v in ['csv', 'jsonl', 'xlsx']" :key="v" :label="v" :value="v" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><input :key="fileInputKey" type="file" @change="chooseFile" /></ElFormItem>
        <ElButton type="primary" :loading="uploading" :disabled="!scopeReady" @click="create">上传并校验</ElButton>
      </ElForm>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElFormItem label="数据集编码"><ElInput v-model="datasetCode" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="filename" label="文件" />
        <ElTableColumn prop="dataset_code" label="数据集" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="progress_percent" label="进度">
          <template #default="{ row }"><ElProgress :percentage="row.progress_percent || 0" /></template>
        </ElTableColumn>
        <ElTableColumn label="有效/无效">
          <template #default="{ row }">{{ row.valid_rows }} / {{ row.invalid_rows }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220">
          <template #default="{ row }">
            <ElButton v-if="row.status === 'ready'" link @click="action(row, 'confirm')">确认导入</ElButton>
            <ElButton
              v-if="['uploading', 'queued', 'validating', 'ready'].includes(row.status)"
              link
              type="danger"
              @click="action(row, 'cancel')"
            >
              取消
            </ElButton>
            <ElButton
              v-if="['failed', 'validation_failed', 'canceled'].includes(row.status)"
              link
              @click="action(row, 'retry')"
            >
              重试
            </ElButton>
            <ElButton v-if="row.invalid_rows > 0" link @click="action(row, 'report')">错误报告</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
</template>
