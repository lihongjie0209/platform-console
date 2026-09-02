<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformDateTime } from '@/platform/date-time';
import { sha256Hex } from '@/platform/file';
import { useTaskPolling } from '@/platform/task-polling';
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
import {
  importDatasetKey,
  importStatusLabel,
  importStatusOptions,
  importTemplateCSV,
  selectedImportDataset,
  supportedImportFormat
} from '../../import-form';
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
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const hasActiveJobs = computed(() =>
  rows.value.some(job => ['uploading', 'queued', 'validating', 'applying'].includes(job.status))
);
const selectedDataset = ref('');
const descriptor = ref<ImportDatasetDescriptor>();
const format = ref('');
const source = ref<File>();
const uploading = ref(false);
const catalogLoading = ref(false);
const fileInputKey = ref(0);
let loadVersion = 0;
const uploadGuard = createLatestRequestGuard();
const descriptorGuard = createLatestRequestGuard();
const catalogGuard = createLatestRequestGuard();
async function load() {
  loadVersion += 1;
  const version = loadVersion;
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  const v = await listImports({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    datasetCode: datasetCode.value,
    page: page.value,
    pageSize: pageSize.value
  });
  if (version !== loadVersion) return;
  rows.value = v.items || [];
  total.value = v.total || 0;
}
useTaskPolling(
  computed(() => scopeReady.value && hasActiveJobs.value),
  load
);
async function searchDatasets(keyword: string) {
  if (!scopeReady.value) {
    datasets.value = [];
    return;
  }
  const request = catalogGuard.begin();
  catalogLoading.value = true;
  try {
    const value = await listDatasets(tenantID.value, applicationID.value, keyword);
    if (catalogGuard.isCurrent(request)) datasets.value = value.items || [];
  } catch (error) {
    if (catalogGuard.isCurrent(request)) {
      datasets.value = [];
      window.$message?.error(error instanceof Error ? error.message : '搜索导入数据集失败');
    }
  } finally {
    if (catalogGuard.isCurrent(request)) catalogLoading.value = false;
  }
}
function search() {
  page.value = 1;
  load();
}
function changePageSize() {
  page.value = 1;
  load();
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
function downloadTemplate() {
  if (!descriptor.value) return;
  const content = `\uFEFF${importTemplateCSV(descriptor.value.columns)}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${descriptor.value.code}-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
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
  catalogGuard.invalidate();
  loadVersion += 1;
  rows.value = [];
  page.value = 1;
  total.value = 0;
  datasets.value = [];
  selectedDataset.value = '';
  descriptor.value = undefined;
  format.value = '';
  source.value = undefined;
  fileInputKey.value += 1;
  uploading.value = false;
  load();
  searchDatasets('');
});
onMounted(() => {
  load();
  searchDatasets('');
});
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
          <ElSelect
            v-model="selectedDataset"
            class="w-260px"
            filterable
            remote
            :remote-method="searchDatasets"
            :loading="catalogLoading"
            @change="changeDataset"
          >
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
      <div v-if="descriptor" class="mb-8px flex-y-center justify-between">
        <span>字段规范</span>
        <ElButton link type="primary" @click="downloadTemplate">下载 CSV 模板</ElButton>
      </div>
      <ElTable v-if="descriptor" :data="descriptor.columns" size="small" border class="mb-16px">
        <ElTableColumn prop="key" label="字段" />
        <ElTableColumn prop="title" label="名称" />
        <ElTableColumn prop="type" label="类型" width="120" />
        <ElTableColumn label="必填" width="80">
          <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
        </ElTableColumn>
        <ElTableColumn label="敏感" width="80">
          <template #default="{ row }">{{ row.sensitive ? '是' : '否' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="example" label="示例" />
        <ElTableColumn prop="description" label="说明" />
      </ElTable>
      <ElForm inline>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-150px">
            <ElOption v-for="option in importStatusOptions" :key="option.value" v-bind="option" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="数据集编码"><ElInput v-model="datasetCode" /></ElFormItem>
        <ElButton @click="search">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="filename" label="文件" />
        <ElTableColumn prop="dataset_code" label="数据集" />
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">{{ importStatusLabel(row.status) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="progress_percent" label="进度">
          <template #default="{ row }"><ElProgress :percentage="row.progress_percent || 0" /></template>
        </ElTableColumn>
        <ElTableColumn label="有效/无效">
          <template #default="{ row }">{{ row.valid_rows }} / {{ row.invalid_rows }}</template>
        </ElTableColumn>
        <ElTableColumn prop="error_message" label="失败原因" show-overflow-tooltip />
        <ElTableColumn label="更新时间" width="170">
          <template #default="{ row }">{{ formatPlatformDateTime(row.updated_at) }}</template>
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
      <div class="mt-16px flex justify-end">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="load"
          @size-change="changePageSize"
        />
      </div>
    </template>
  </ElCard>
</template>
