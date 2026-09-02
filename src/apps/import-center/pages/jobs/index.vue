<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { sha256Hex } from '@/platform/file';
import type { ImportDataset, ImportDatasetDescriptor, ImportJob } from '../../api';
import {
  cancelImport,
  completeImportUpload,
  confirmImport,
  createImport,
  describeDataset,
  errorReport,
  listDatasets,
  listImports,
  putImportFile,
  retryImport
} from '../../api';
import { importDatasetKey, selectedImportDataset, supportedImportFormat } from '../../import-form';
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
const descriptor = ref<ImportDatasetDescriptor>();
const format = ref('');
const source = ref<File>();
const uploading = ref(false);
const fileInputKey = ref(0);
let loadVersion = 0;
const uploadGuard = createLatestRequestGuard();
const descriptorGuard = createLatestRequestGuard();
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
  const dataset = selectedImportDataset(datasets.value, selectedDataset.value);
  if (!dataset || !dataset.formats.includes(format.value)) return;
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
async function changeDataset() {
  const selected = selectedImportDataset(datasets.value, selectedDataset.value);
  descriptor.value = undefined;
  format.value = supportedImportFormat(selected, format.value);
  if (!selected) return;
  const request = descriptorGuard.begin();
  try {
    const value = await describeDataset({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      providerService: selected.provider_service,
      datasetCode: selected.code
    });
    if (!descriptorGuard.isCurrent(request)) return;
    descriptor.value = value;
    format.value = value.formats.includes(format.value) ? format.value : value.formats[0] || '';
  } catch (error) {
    if (descriptorGuard.isCurrent(request)) {
      window.$message?.error(error instanceof Error ? error.message : '读取数据集规范失败');
    }
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
  descriptorGuard.invalidate();
  loadVersion += 1;
  rows.value = [];
  datasets.value = [];
  selectedDataset.value = '';
  descriptor.value = undefined;
  format.value = '';
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
          <ElSelect v-model="selectedDataset" class="w-260px" @change="changeDataset">
            <ElOption
              v-for="v in datasets"
              :key="importDatasetKey(v)"
              :label="`${v.title} (${v.provider_service})`"
              :value="importDatasetKey(v)"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="格式">
          <ElSelect v-model="format" class="w-110px">
            <ElOption
              v-for="v in selectedImportDataset(datasets, selectedDataset)?.formats || []"
              :key="v"
              :label="v"
              :value="v"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><input :key="fileInputKey" type="file" @change="chooseFile" /></ElFormItem>
        <ElButton
          type="primary"
          :loading="uploading"
          :disabled="!scopeReady || !selectedDataset || !format || !source"
          @click="create"
        >
          上传并校验
        </ElButton>
      </ElForm>
      <ElTable v-if="descriptor" :data="descriptor.columns" size="small" border class="mb-16px">
        <ElTableColumn prop="key" label="字段" />
        <ElTableColumn prop="title" label="名称" />
        <ElTableColumn prop="type" label="类型" width="120" />
        <ElTableColumn label="必填" width="80">
          <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="example" label="示例" />
        <ElTableColumn prop="description" label="说明" />
      </ElTable>
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
