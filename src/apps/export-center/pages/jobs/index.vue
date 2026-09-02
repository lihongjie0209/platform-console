<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { parseJSONObject } from '@/platform/json';
import type { ExportDataset, ExportDatasetDescriptor, ExportJob } from '../../api';
import {
  cancelExport,
  createExport,
  describeExportDataset,
  downloadExport,
  listExportDatasets,
  listExports,
  retryExport
} from '../../api';
import { datasetKey, descriptorDefaults, findDataset } from '../../export-form';
defineOptions({ name: 'ExportCenterJobs' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<ExportJob[]>([]);
const status = ref('');
const datasetCode = ref('');
const visible = ref(false);
const datasets = ref<ExportDataset[]>([]);
const descriptor = ref<ExportDatasetDescriptor>();
const catalogLoading = ref(false);
const form = reactive({ datasetKey: '', format: '', filename: '', query: '{}', columns: [] as string[] });
const loadGuard = createLatestRequestGuard();
const catalogGuard = createLatestRequestGuard();
const descriptorGuard = createLatestRequestGuard();
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    return;
  }
  const v = await listExports({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    datasetCode: datasetCode.value
  });
  if (loadGuard.isCurrent(request)) rows.value = v.items || [];
}
async function openCreate() {
  visible.value = true;
  form.datasetKey = '';
  form.format = '';
  form.columns = [];
  descriptor.value = undefined;
  const request = catalogGuard.begin();
  catalogLoading.value = true;
  try {
    const value = await listExportDatasets(tenantID.value, applicationID.value);
    if (catalogGuard.isCurrent(request)) datasets.value = value.items || [];
  } finally {
    if (catalogGuard.isCurrent(request)) catalogLoading.value = false;
  }
}
async function selectDataset() {
  const selected = findDataset(datasets.value, form.datasetKey);
  descriptor.value = undefined;
  if (!selected) return;
  const request = descriptorGuard.begin();
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
}
async function create() {
  if (!scopeReady.value) return;
  const selected = findDataset(datasets.value, form.datasetKey);
  if (!selected || !descriptor.value) return;
  try {
    await createExport({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      datasetCode: selected.code,
      providerService: selected.provider_service,
      format: form.format,
      filename: form.filename,
      query: parseJSONObject(form.query, '查询条件'),
      columns: form.columns
    });
    visible.value = false;
    await load();
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : '创建失败');
  }
}
async function action(job: ExportJob, type: 'cancel' | 'retry' | 'download') {
  if (type === 'cancel') await cancelExport(job);
  if (type === 'retry') await retryExport(job);
  if (type === 'download') {
    const value = await downloadExport(job);
    window.open(value.url, '_blank', 'noopener');
    return;
  }
  await load();
}
watch([tenantID, applicationID], () => {
  visible.value = false;
  rows.value = [];
  datasets.value = [];
  descriptor.value = undefined;
  catalogGuard.invalidate();
  descriptorGuard.invalidate();
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
        <ElButton type="primary" :disabled="!scopeReady" @click="openCreate">创建导出</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElFormItem label="数据集"><ElInput v-model="datasetCode" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="filename" label="文件" />
        <ElTableColumn prop="dataset_code" label="数据集" />
        <ElTableColumn prop="format" label="格式" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="progress_percent" label="进度">
          <template #default="{ row }"><ElProgress :percentage="row.progress_percent || 0" /></template>
        </ElTableColumn>
        <ElTableColumn prop="rows_exported" label="行数" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton v-if="row.status === 'succeeded'" link @click="action(row, 'download')">下载</ElButton>
            <ElButton
              v-if="['queued', 'running'].includes(row.status)"
              link
              type="danger"
              @click="action(row, 'cancel')"
            >
              取消
            </ElButton>
            <ElButton v-if="['failed', 'canceled'].includes(row.status)" link @click="action(row, 'retry')">
              重试
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
  <ElDialog v-model="visible" title="创建导出">
    <ElForm label-width="110px">
      <ElFormItem label="数据集">
        <ElSelect v-model="form.datasetKey" class="w-full" filterable :loading="catalogLoading" @change="selectDataset">
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
      <ElFormItem label="查询 JSON"><ElInput v-model="form.query" type="textarea" :rows="6" /></ElFormItem>
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
      <ElButton type="primary" :disabled="!descriptor || !form.format" @click="create">创建</ElButton>
    </template>
  </ElDialog>
</template>
