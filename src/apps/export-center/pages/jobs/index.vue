<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformDateTime } from '@/platform/date-time';
import { formatPlatformBytes } from '@/platform/display';
import { ensureIdempotencyKey, operationIdempotencyKey } from '@/platform/idempotency-key';
import { useKeyedAsyncAction } from '@/platform/keyed-async-action';
import { hasPersistedStateChanged } from '@/platform/optimistic-mutation';
import { remoteSearchPage } from '@/platform/remote-search';
import { shouldReportTaskLoadError, useTaskPolling } from '@/platform/task-polling';
import type { ExportDataset, ExportDatasetDescriptor, ExportJob } from '../../api';
import {
  cancelExport,
  createExport,
  describeExportDataset,
  downloadExport,
  getExport,
  listExportDatasets,
  listExports,
  retryExport
} from '../../api';
import type { ExportQueryValue } from '../../export-form';
import {
  buildExportQuery,
  datasetKey,
  descriptorDefaults,
  exportQueryDefaults,
  exportStatusLabel,
  exportStatusOptions,
  findDataset
} from '../../export-form';
defineOptions({ name: 'ExportCenterJobs' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<ExportJob[]>([]);
const listLoading = ref(false);
const status = ref('');
const datasetCode = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const { active: actionLoading, run: runTaskAction, reset: resetTaskAction } = useKeyedAsyncAction();
const hasActiveJobs = computed(() => rows.value.some(job => ['queued', 'running'].includes(job.status)));
const visible = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<ExportJob>();
const datasets = ref<ExportDataset[]>([]);
const descriptor = ref<ExportDatasetDescriptor>();
const catalogLoading = ref(false);
const form = reactive({
  datasetKey: '',
  format: '',
  filename: '',
  query: {} as Record<string, ExportQueryValue>,
  columns: [] as string[],
  idempotencyKey: ''
});
const actionIdempotencyKeys = new Map<string, string>();
const loadGuard = createLatestRequestGuard();
const catalogGuard = createLatestRequestGuard();
const descriptorGuard = createLatestRequestGuard();
const detailGuard = createLatestRequestGuard();
const canCreate = computed(() =>
  store.hasPermission({
    scope: 'tenant',
    codes: ['export.dataset.list', 'export.dataset.read', 'export.job.create'],
    strategy: 'all'
  })
);
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'export.job.read' }));
const canCancel = computed(() => store.hasPermission({ scope: 'tenant', codes: 'export.job.cancel' }));
const canRetry = computed(() => store.hasPermission({ scope: 'tenant', codes: 'export.job.retry' }));
const canDownload = computed(() => store.hasPermission({ scope: 'tenant', codes: 'export.job.download' }));
function queryString(key?: string) {
  const value = key ? form.query[key] : undefined;
  return typeof value === 'string' ? value : '';
}
function queryNumber(key?: string) {
  const value = key ? form.query[key] : undefined;
  return typeof value === 'number' ? value : undefined;
}
function queryBoolean(key?: string) {
  const value = key ? form.query[key] : undefined;
  return typeof value === 'boolean' ? value : undefined;
}
function setQueryValue(key: string | undefined, value: unknown) {
  if (!key) return;
  form.query[key] =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
}
async function load(silent = false) {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  listLoading.value = true;
  try {
    const v = await listExports({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      status: status.value,
      datasetCode: datasetCode.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (loadGuard.isCurrent(request)) {
      rows.value = v.items || [];
      total.value = v.total || 0;
    }
  } catch (error) {
    if (shouldReportTaskLoadError(loadGuard.isCurrent(request), silent)) {
      window.$message?.error(error instanceof Error ? error.message : '读取导出任务失败');
    }
  } finally {
    if (loadGuard.isCurrent(request)) listLoading.value = false;
  }
}
useTaskPolling(
  computed(() => scopeReady.value && hasActiveJobs.value),
  () => load(true)
);
function search() {
  page.value = 1;
  load();
}
function changePageSize() {
  page.value = 1;
  load();
}
async function openCreate() {
  if (!canCreate.value) return;
  visible.value = true;
  form.datasetKey = '';
  form.format = '';
  form.columns = [];
  form.query = {};
  form.idempotencyKey = '';
  descriptor.value = undefined;
  await searchDatasets('');
}
async function searchDatasets(keyword: string) {
  if (!canCreate.value || !scopeReady.value) {
    datasets.value = [];
    return;
  }
  const request = catalogGuard.begin();
  catalogLoading.value = true;
  try {
    const value = await listExportDatasets({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      search: keyword.trim(),
      ...remoteSearchPage(50)
    });
    if (catalogGuard.isCurrent(request)) {
      const selected = findDataset(datasets.value, form.datasetKey);
      datasets.value = selected
        ? Array.from(new Map([selected, ...value.items].map(item => [datasetKey(item), item])).values())
        : value.items;
    }
  } catch (error) {
    if (catalogGuard.isCurrent(request)) {
      datasets.value = [];
      window.$message?.error(error instanceof Error ? error.message : '搜索导出数据集失败');
    }
  } finally {
    if (catalogGuard.isCurrent(request)) catalogLoading.value = false;
  }
}
async function selectDataset() {
  if (!canCreate.value) return;
  const selected = findDataset(datasets.value, form.datasetKey);
  descriptor.value = undefined;
  if (!selected) return;
  const request = descriptorGuard.begin();
  try {
    const value = await describeExportDataset({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      providerService: selected.provider_service,
      datasetCode: selected.code
    });
    if (!descriptorGuard.isCurrent(request)) return;
    descriptor.value = value;
    const defaults = descriptorDefaults(value);
    form.format = defaults.format;
    form.columns = defaults.columns;
    form.query = exportQueryDefaults(value);
  } catch (error) {
    if (descriptorGuard.isCurrent(request)) {
      window.$message?.error(error instanceof Error ? error.message : '读取导出数据集规范失败');
    }
  }
}
async function create() {
  if (!canCreate.value || !scopeReady.value) return;
  const selected = findDataset(datasets.value, form.datasetKey);
  if (!selected || !descriptor.value) return;
  try {
    form.idempotencyKey = ensureIdempotencyKey(form.idempotencyKey);
    await createExport({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      datasetCode: selected.code,
      providerService: selected.provider_service,
      format: form.format,
      filename: form.filename,
      query: buildExportQuery(descriptor.value, form.query),
      columns: form.columns,
      idempotencyKey: form.idempotencyKey
    });
    visible.value = false;
    await load();
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : '创建失败');
  }
}
watch(
  () => [form.datasetKey, form.format, form.filename, JSON.stringify(form.query), form.columns.join('\u0000')],
  () => {
    form.idempotencyKey = '';
  }
);
async function openDetail(job: ExportJob) {
  if (!canRead.value) return;
  detailVisible.value = true;
  detail.value = undefined;
  detailLoading.value = true;
  const request = detailGuard.begin();
  try {
    const value = await getExport(job);
    if (detailGuard.isCurrent(request)) detail.value = value;
  } catch (error) {
    if (detailGuard.isCurrent(request)) {
      detailVisible.value = false;
      window.$message?.error(error instanceof Error ? error.message : '读取导出详情失败');
    }
  } finally {
    if (detailGuard.isCurrent(request)) detailLoading.value = false;
  }
}
async function action(job: ExportJob, type: 'cancel' | 'retry' | 'download') {
  if (
    !canRead.value ||
    (type === 'cancel' && !canCancel.value) ||
    (type === 'retry' && !canRetry.value) ||
    (type === 'download' && !canDownload.value)
  )
    return;
  const key = `${job.id}:${type}`;
  await runTaskAction(key, async () => {
    try {
      const current = await getExport(job);
      if (type !== 'download' && hasPersistedStateChanged(job.status, current.status)) {
        window.$message?.warning('导出任务状态已变化，请确认最新状态后重试');
        await load();
        return;
      }
      if (type === 'cancel') await cancelExport(current);
      if (type === 'retry') await retryExport(current, operationIdempotencyKey(actionIdempotencyKeys, key));
      if (type === 'download') {
        const value = await downloadExport(current);
        window.open(value.url, '_blank', 'noopener');
        return;
      }
      actionIdempotencyKeys.delete(key);
      await load();
    } catch (error) {
      window.$message?.error(error instanceof Error ? error.message : '导出任务操作失败');
    }
  });
}
watch([tenantID, applicationID], () => {
  visible.value = false;
  rows.value = [];
  listLoading.value = false;
  page.value = 1;
  total.value = 0;
  datasets.value = [];
  descriptor.value = undefined;
  catalogGuard.invalidate();
  descriptorGuard.invalidate();
  detailGuard.invalidate();
  detailVisible.value = false;
  detail.value = undefined;
  resetTaskAction();
  actionIdempotencyKeys.clear();
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">数据导出</h2>
          <p class="mb-0 text-#999">为 {{ applicationName }} 异步生成导出文件，成功后签发短时下载地址。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="openCreate">创建导出</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-140px">
            <ElOption v-for="option in exportStatusOptions" :key="option.value" v-bind="option" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="数据集"><ElInput v-model="datasetCode" /></ElFormItem>
        <ElButton @click="search">查询</ElButton>
      </ElForm>
      <ElTable v-loading="listLoading" :data="rows" border>
        <ElTableColumn prop="filename" label="文件" />
        <ElTableColumn prop="dataset_code" label="数据集" />
        <ElTableColumn prop="format" label="格式" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">{{ exportStatusLabel(row.status) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="progress_percent" label="进度">
          <template #default="{ row }"><ElProgress :percentage="row.progress_percent || 0" /></template>
        </ElTableColumn>
        <ElTableColumn prop="rows_exported" label="行数" />
        <ElTableColumn prop="error_message" label="失败原因" show-overflow-tooltip />
        <ElTableColumn label="更新时间" width="170">
          <template #default="{ row }">{{ formatPlatformDateTime(row.updated_at) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220">
          <template #default="{ row }">
            <ElButton v-if="canRead" link @click="openDetail(row)">详情</ElButton>
            <ElButton
              v-if="canRead && canDownload && row.status === 'succeeded'"
              link
              :loading="actionLoading === `${row.id}:download`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'download')"
            >
              下载
            </ElButton>
            <ElButton
              v-if="canRead && canCancel && ['queued', 'running'].includes(row.status)"
              link
              type="danger"
              :loading="actionLoading === `${row.id}:cancel`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'cancel')"
            >
              取消
            </ElButton>
            <ElButton
              v-if="canRead && canRetry && ['failed', 'canceled'].includes(row.status)"
              link
              :loading="actionLoading === `${row.id}:retry`"
              :disabled="Boolean(actionLoading)"
              @click="action(row, 'retry')"
            >
              重试
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
  <ElDrawer v-model="detailVisible" title="导出任务详情" size="620px">
    <div v-loading="detailLoading">
      <ElDescriptions v-if="detail" :column="2" border>
        <ElDescriptionsItem label="任务 ID" :span="2">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件名">{{ detail.filename || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">{{ exportStatusLabel(detail.status) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="数据集">{{ detail.dataset_code }}</ElDescriptionsItem>
        <ElDescriptionsItem label="提供方">{{ detail.provider_service }}</ElDescriptionsItem>
        <ElDescriptionsItem label="格式">{{ detail.format || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="进度">{{ detail.progress_percent || 0 }}%</ElDescriptionsItem>
        <ElDescriptionsItem label="导出行数">{{ detail.rows_exported ?? 0 }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文件大小">{{ formatPlatformBytes(detail.bytes_written) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="校验和" :span="2">{{ detail.checksum || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="错误码">{{ detail.error_code || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="版本">{{ detail.version }}</ElDescriptionsItem>
        <ElDescriptionsItem label="失败原因" :span="2">{{ detail.error_message || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">{{ formatPlatformDateTime(detail.created_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="开始时间">{{ formatPlatformDateTime(detail.started_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="完成时间">{{ formatPlatformDateTime(detail.completed_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="过期时间">{{ formatPlatformDateTime(detail.expires_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间" :span="2">
          {{ formatPlatformDateTime(detail.updated_at) }}
        </ElDescriptionsItem>
      </ElDescriptions>
    </div>
  </ElDrawer>
  <ElDialog v-model="visible" title="创建导出">
    <ElForm label-width="110px">
      <ElFormItem label="数据集">
        <ElSelect
          v-model="form.datasetKey"
          class="w-full"
          filterable
          remote
          :remote-method="searchDatasets"
          :loading="catalogLoading"
          @change="selectDataset"
        >
          <ElOption
            v-for="item in datasets"
            :key="datasetKey(item)"
            :value="datasetKey(item)"
            :label="`${item.title}（${item.provider_service}）`"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="格式">
        <ElSelect v-model="form.format">
          <ElOption v-for="v in descriptor?.formats || []" :key="v" :label="v" :value="v" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="文件名"><ElInput v-model="form.filename" /></ElFormItem>
      <ElFormItem
        v-for="field in descriptor?.query_fields || []"
        :key="field.key"
        :label="field.title || field.key"
        :required="field.required"
      >
        <ElSelect
          v-if="field.options?.length"
          :model-value="queryString(field.key)"
          clearable
          class="w-full"
          @update:model-value="setQueryValue(field.key, $event)"
        >
          <ElOption v-for="option in field.options" :key="option" :label="option" :value="option" />
        </ElSelect>
        <ElDatePicker
          v-else-if="field.type === 'datetime'"
          :model-value="queryString(field.key)"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
          class="w-full"
          @update:model-value="setQueryValue(field.key, $event)"
        />
        <ElInputNumber
          v-else-if="field.type === 'integer' || field.type === 'number'"
          :model-value="queryNumber(field.key)"
          :precision="field.type === 'integer' ? 0 : undefined"
          controls-position="right"
          class="w-full"
          @update:model-value="setQueryValue(field.key, $event)"
        />
        <ElSelect
          v-else-if="field.type === 'boolean'"
          :model-value="queryBoolean(field.key)"
          clearable
          class="w-full"
          @update:model-value="setQueryValue(field.key, $event)"
        >
          <ElOption label="是" :value="true" />
          <ElOption label="否" :value="false" />
        </ElSelect>
        <ElInput
          v-else
          :model-value="queryString(field.key)"
          clearable
          @update:model-value="setQueryValue(field.key, $event)"
        />
        <div v-if="field.description" class="mt-4px text-12px text-#999">{{ field.description }}</div>
      </ElFormItem>
      <ElFormItem v-if="descriptor" label="选择列">
        <ElCheckboxGroup v-model="form.columns">
          <ElCheckbox v-for="column in descriptor.columns" :key="column.key" :value="column.key">
            {{ column.title || column.key }}
          </ElCheckbox>
        </ElCheckboxGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="canCreate" type="primary" :disabled="!descriptor || !form.format" @click="create">创建</ElButton>
    </template>
  </ElDialog>
</template>
