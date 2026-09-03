<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformDateTime } from '@/platform/date-time';
import { formatPlatformBytes } from '@/platform/display';
import { sha256Hex } from '@/platform/file';
import {
  ensureIdempotencyKey,
  operationIdempotencyKey,
  operationPhaseIdempotencyKey
} from '@/platform/idempotency-key';
import { useKeyedAsyncAction } from '@/platform/keyed-async-action';
import { hasPersistedStateChanged } from '@/platform/optimistic-mutation';
import { remoteSearchPage } from '@/platform/remote-search';
import { shouldReportTaskLoadError, useTaskPolling } from '@/platform/task-polling';
import type { ImportDataset, ImportDatasetDescriptor, ImportJob } from '../../api';
import {
  cancelImport,
  completeImportUpload,
  confirmImport,
  createImport,
  describeDataset,
  errorReport,
  getImport,
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
const listLoading = ref(false);
const datasets = ref<ImportDataset[]>([]);
const status = ref('');
const datasetCode = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const { active: actionLoading, run: runTaskAction, reset: resetTaskAction } = useKeyedAsyncAction();
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<ImportJob>();
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
const createIdempotencyKey = ref('');
const actionIdempotencyKeys = new Map<string, string>();
let loadVersion = 0;
const uploadGuard = createLatestRequestGuard();
const descriptorGuard = createLatestRequestGuard();
const catalogGuard = createLatestRequestGuard();
const detailGuard = createLatestRequestGuard();
const canCreate = computed(() =>
  store.hasPermission({
    scope: 'tenant',
    codes: ['import.dataset.list', 'import.dataset.read', 'import.job.create', 'import.job.upload'],
    strategy: 'all'
  })
);
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'import.job.read' }));
const canConfirm = computed(() => store.hasPermission({ scope: 'tenant', codes: 'import.job.confirm' }));
const canCancel = computed(() => store.hasPermission({ scope: 'tenant', codes: 'import.job.cancel' }));
const canRetry = computed(() =>
  store.hasPermission({ scope: 'tenant', codes: ['import.job.retry', 'import.job.upload'], strategy: 'all' })
);
const canDownloadReport = computed(() => store.hasPermission({ scope: 'tenant', codes: 'import.job.download-error' }));
async function load(silent = false) {
  loadVersion += 1;
  const version = loadVersion;
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  listLoading.value = true;
  try {
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
  } catch (error) {
    if (shouldReportTaskLoadError(version === loadVersion, silent)) {
      window.$message?.error(error instanceof Error ? error.message : '读取导入任务失败');
    }
  } finally {
    if (version === loadVersion) listLoading.value = false;
  }
}
useTaskPolling(
  computed(() => scopeReady.value && hasActiveJobs.value),
  () => load(true)
);
async function searchDatasets(keyword: string) {
  if (!canCreate.value || !scopeReady.value) {
    datasets.value = [];
    return;
  }
  const request = catalogGuard.begin();
  catalogLoading.value = true;
  try {
    const value = await listDatasets({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      search: keyword.trim(),
      ...remoteSearchPage(50)
    });
    if (catalogGuard.isCurrent(request)) {
      const selected = selectedImportDataset(datasets.value, selectedDataset.value);
      datasets.value = selected
        ? Array.from(new Map([selected, ...value.items].map(item => [importDatasetKey(item), item])).values())
        : value.items;
    }
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
  createIdempotencyKey.value = '';
}
async function create() {
  if (!canCreate.value || !scopeReady.value || !source.value) return;
  const request = uploadGuard.begin();
  const selectedFile = source.value;
  const tenant = tenantID.value;
  const application = applicationID.value;
  const dataset = selectedImportDataset(datasets.value, selectedDataset.value);
  if (!dataset || !dataset.formats.includes(format.value)) return;
  createIdempotencyKey.value = ensureIdempotencyKey(createIdempotencyKey.value);
  uploading.value = true;
  try {
    const auth = await createImport({
      tenantID: tenant,
      applicationID: application,
      dataset,
      format: format.value,
      filename: selectedFile.name,
      idempotencyKey: createIdempotencyKey.value
    });
    await putImportFile(auth, selectedFile);
    const checksum = await sha256Hex(selectedFile);
    await completeImportUpload({
      job: auth.job,
      size: selectedFile.size,
      checksum,
      idempotencyKey: operationPhaseIdempotencyKey(createIdempotencyKey.value, 'complete')
    });
    if (!uploadGuard.isCurrent(request)) return;
    window.$message?.success('文件已上传，正在校验');
    createIdempotencyKey.value = '';
    await load();
  } catch (error) {
    if (uploadGuard.isCurrent(request)) {
      window.$message?.error(error instanceof Error ? error.message : '上传导入文件失败');
    }
  } finally {
    if (uploadGuard.isCurrent(request)) uploading.value = false;
  }
}
watch([selectedDataset, format], () => {
  createIdempotencyKey.value = '';
});
async function changeDataset() {
  if (!canCreate.value) return;
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
async function openDetail(job: ImportJob) {
  if (!canRead.value) return;
  detailVisible.value = true;
  detail.value = undefined;
  detailLoading.value = true;
  const request = detailGuard.begin();
  try {
    const value = await getImport(job);
    if (detailGuard.isCurrent(request)) detail.value = value;
  } catch (error) {
    if (detailGuard.isCurrent(request)) {
      detailVisible.value = false;
      window.$message?.error(error instanceof Error ? error.message : '读取导入详情失败');
    }
  } finally {
    if (detailGuard.isCurrent(request)) detailLoading.value = false;
  }
}
async function action(job: ImportJob, type: 'confirm' | 'cancel' | 'retry' | 'report') {
  if (
    !canRead.value ||
    (type === 'confirm' && !canConfirm.value) ||
    (type === 'cancel' && !canCancel.value) ||
    (type === 'retry' && !canRetry.value) ||
    (type === 'report' && !canDownloadReport.value)
  )
    return;
  const key = `${job.id}:${type}`;
  await runTaskAction(key, async () => {
    try {
      const current = await getImport(job);
      if (type !== 'report' && hasPersistedStateChanged(job.status, current.status)) {
        window.$message?.warning('导入任务状态已变化，请确认最新状态后重试');
        await load();
        return;
      }
      if (type === 'confirm') await confirmImport(current, operationIdempotencyKey(actionIdempotencyKeys, key));
      if (type === 'cancel') await cancelImport(current);
      if (type === 'retry') {
        if (!source.value) {
          window.$message?.warning('请先选择修正后的文件');
          return;
        }
        const retryKey = operationIdempotencyKey(actionIdempotencyKeys, key);
        const auth = await retryImport(current, retryKey);
        await putImportFile(auth, source.value);
        await completeImportUpload({
          job: auth.job,
          size: source.value.size,
          checksum: await sha256Hex(source.value),
          idempotencyKey: operationPhaseIdempotencyKey(retryKey, 'complete')
        });
      }
      if (type === 'report') {
        const value = await errorReport(current);
        window.open(value.url, '_blank', 'noopener');
        return;
      }
      actionIdempotencyKeys.delete(key);
      await load();
    } catch (error) {
      window.$message?.error(error instanceof Error ? error.message : '导入任务操作失败');
    }
  });
}
watch([tenantID, applicationID], () => {
  uploadGuard.invalidate();
  descriptorGuard.invalidate();
  catalogGuard.invalidate();
  detailGuard.invalidate();
  detailVisible.value = false;
  detail.value = undefined;
  resetTaskAction();
  createIdempotencyKey.value = '';
  actionIdempotencyKeys.clear();
  loadVersion += 1;
  rows.value = [];
  listLoading.value = false;
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
        <ElFormItem v-if="canCreate" label="数据集">
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
        <ElFormItem v-if="canCreate" label="格式">
          <ElSelect v-model="format" class="w-110px">
            <ElOption
              v-for="v in selectedImportDataset(datasets, selectedDataset)?.formats || []"
              :key="v"
              :label="v"
              :value="v"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="canCreate || canRetry">
          <input :key="fileInputKey" type="file" @change="chooseFile" />
        </ElFormItem>
        <ElButton
          v-if="canCreate"
          type="primary"
          :loading="uploading"
          :disabled="!scopeReady || !selectedDataset || !format || !source"
          @click="create"
        >
          上传并校验
        </ElButton>
      </ElForm>
      <div v-if="canCreate && descriptor" class="mb-8px flex-y-center justify-between">
        <span>字段规范</span>
        <ElButton link type="primary" @click="downloadTemplate">下载 CSV 模板</ElButton>
      </div>
      <ElTable v-if="canCreate && descriptor" :data="descriptor.columns" size="small" border class="mb-16px">
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
      <ElTable v-loading="listLoading" :data="rows" border>
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
            <ElButton v-if="canRead" link @click="openDetail(row)">详情</ElButton>
            <ElButton
              v-if="canRead && canConfirm && row.status === 'ready'"
              link
              :loading="actionLoading === `${row.id}:confirm`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'confirm')"
            >
              确认导入
            </ElButton>
            <ElButton
              v-if="canRead && canCancel && ['uploading', 'queued', 'validating', 'ready'].includes(row.status)"
              link
              type="danger"
              :loading="actionLoading === `${row.id}:cancel`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'cancel')"
            >
              取消
            </ElButton>
            <ElButton
              v-if="canRead && canRetry && ['failed', 'validation_failed', 'canceled'].includes(row.status)"
              link
              :loading="actionLoading === `${row.id}:retry`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'retry')"
            >
              重试
            </ElButton>
            <ElButton
              v-if="canRead && canDownloadReport && row.invalid_rows > 0"
              link
              :loading="actionLoading === `${row.id}:report`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'report')"
            >
              错误报告
            </ElButton>
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
          @current-change="() => load()"
          @size-change="changePageSize"
        />
      </div>
    </template>
  </ElCard>
  <ElDrawer v-model="detailVisible" title="导入任务详情" size="620px">
    <div v-loading="detailLoading">
      <ElDescriptions v-if="detail" :column="2" border>
        <ElDescriptionsItem label="任务 ID" :span="2">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件名">{{ detail.filename || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">{{ importStatusLabel(detail.status) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="数据集">{{ detail.dataset_code }}</ElDescriptionsItem>
        <ElDescriptionsItem label="提供方">{{ detail.provider_service }}</ElDescriptionsItem>
        <ElDescriptionsItem label="格式">{{ detail.format || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="源文件大小">{{ formatPlatformBytes(detail.source_bytes) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="进度">{{ detail.progress_percent || 0 }}%</ElDescriptionsItem>
        <ElDescriptionsItem label="总行数">{{ detail.total_rows ?? 0 }}</ElDescriptionsItem>
        <ElDescriptionsItem label="有效 / 无效">
          {{ detail.valid_rows ?? 0 }} / {{ detail.invalid_rows ?? 0 }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="已应用行数">{{ detail.applied_rows ?? 0 }}</ElDescriptionsItem>
        <ElDescriptionsItem label="版本">{{ detail.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="校验和" :span="2">{{ detail.source_checksum || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="错误码">{{ detail.error_code || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="失败原因">{{ detail.error_message || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="上传过期">{{ formatPlatformDateTime(detail.upload_expires_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="开始时间">{{ formatPlatformDateTime(detail.started_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="完成时间">{{ formatPlatformDateTime(detail.completed_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="结果过期">{{ formatPlatformDateTime(detail.result_expires_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">{{ formatPlatformDateTime(detail.created_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">{{ formatPlatformDateTime(detail.updated_at) }}</ElDescriptionsItem>
      </ElDescriptions>
    </div>
  </ElDrawer>
</template>
