<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCopyText } from '@/components/business';
import { createLatestRequestGuard } from '@/platform/application-context';
import { formatPlatformDateTime } from '@/platform/date-time';
import type { AuditQuery, AuditRecord } from '../../api';
import { exportAuditRecords, listAuditRecords } from '../../api';

defineOptions({ name: 'AuditCenterRecords' });

interface SearchForm {
  actor_id: string;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  request_id: string;
  trace_id: string;
  source_service: string;
}

const platformStore = usePlatformStore();
const loading = ref(false);
const exporting = ref(false);
const rows = ref<AuditRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const occurredRange = ref<string[]>([]);
const detailVisible = ref(false);
const selected = ref<AuditRecord>();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const loadGuard = createLatestRequestGuard();
const exportGuard = createLatestRequestGuard();
const form = reactive<SearchForm>({
  actor_id: '',
  actor_type: '',
  action: '',
  resource_type: '',
  resource_id: '',
  request_id: '',
  trace_id: '',
  source_service: ''
});

function currentQuery(): AuditQuery {
  return {
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    actorID: form.actor_id,
    actorType: form.actor_type,
    action: form.action,
    resourceType: form.resource_type,
    resourceID: form.resource_id,
    requestID: form.request_id,
    traceID: form.trace_id,
    sourceService: form.source_service,
    occurredFrom: occurredRange.value[0],
    occurredTo: occurredRange.value[1],
    page: page.value,
    pageSize: pageSize.value
  };
}

async function loadData() {
  const request = loadGuard.begin();
  if (!tenantID.value || !applicationID.value) {
    rows.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await listAuditRecords(currentQuery());
    if (loadGuard.isCurrent(request)) {
      rows.value = result.records;
      total.value = result.total;
    }
  } finally {
    if (loadGuard.isCurrent(request)) loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}

function resetSearch() {
  Object.assign(form, {
    actor_id: '',
    actor_type: '',
    action: '',
    resource_type: '',
    resource_id: '',
    request_id: '',
    trace_id: '',
    source_service: ''
  });
  occurredRange.value = [];
  search();
}

function showDetail(row: AuditRecord) {
  selected.value = row;
  detailVisible.value = true;
}

function summaryText(value: unknown) {
  if (value === undefined || value === null) return '{}';
  return JSON.stringify(value, null, 2);
}

async function exportCSV() {
  if (!tenantID.value || !applicationID.value) return;
  const request = exportGuard.begin();
  exporting.value = true;
  try {
    const result = await exportAuditRecords(currentQuery());
    if (!exportGuard.isCurrent(request)) return;
    const blob = new Blob([String(result.content || '')], { type: result.content_type || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.filename || 'audit-records.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    window.$message?.success(`已导出 ${Number(result.record_count || 0)} 条审计记录`);
  } finally {
    if (exportGuard.isCurrent(request)) exporting.value = false;
  }
}

function changePage(value: number) {
  page.value = value;
  loadData();
}

function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  loadData();
}

watch([tenantID, applicationID], () => {
  exportGuard.invalidate();
  rows.value = [];
  total.value = 0;
  selected.value = undefined;
  detailVisible.value = false;
  exporting.value = false;
  page.value = 1;
  loadData();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">审计记录</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            按当前租户和应用查询不可变业务审计，支持请求和 Trace 全链路追踪。
          </p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton :loading="exporting" :disabled="!tenantID || !applicationID" @click="exportCSV">导出 CSV</ElButton>
        </div>
      </div>
    </template>

    <ElAlert
      v-if="!tenantID || !applicationID"
      title="请先在应用选择页选择租户和应用"
      type="warning"
      show-icon
      :closable="false"
    />
    <template v-else>
      <ElForm inline class="mb-16px" @submit.prevent="search">
        <ElFormItem label="操作者"><ElInput v-model="form.actor_id" clearable placeholder="Actor ID" /></ElFormItem>
        <ElFormItem label="身份类型">
          <ElSelect v-model="form.actor_type" clearable class="w-140px" placeholder="全部">
            <ElOption label="用户" value="user" />
            <ElOption label="服务账号" value="service_account" />
            <ElOption label="PSK" value="psk" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="动作">
          <ElInput v-model="form.action" clearable placeholder="如 invoice.updated" />
        </ElFormItem>
        <ElFormItem label="来源服务"><ElInput v-model="form.source_service" clearable /></ElFormItem>
        <ElFormItem label="资源类型"><ElInput v-model="form.resource_type" clearable /></ElFormItem>
        <ElFormItem label="资源 ID"><ElInput v-model="form.resource_id" clearable /></ElFormItem>
        <ElFormItem label="Request ID"><ElInput v-model="form.request_id" clearable /></ElFormItem>
        <ElFormItem label="Trace ID"><ElInput v-model="form.trace_id" clearable /></ElFormItem>
        <ElFormItem label="发生时间">
          <ElDatePicker
            v-model="occurredRange"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" @click="search">查询</ElButton>
          <ElButton @click="resetSearch">重置</ElButton>
        </ElFormItem>
      </ElForm>

      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn label="发生时间" min-width="190">
          <template #default="{ row }">{{ formatPlatformDateTime(row.occurred_at) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="action" label="动作" min-width="190" />
        <ElTableColumn prop="source_service" label="来源服务" min-width="170" />
        <ElTableColumn label="操作者" min-width="190">
          <template #default="{ row }">{{ row.actor_id || '-' }}（{{ row.actor_type || '-' }}）</template>
        </ElTableColumn>
        <ElTableColumn label="资源" min-width="230">
          <template #default="{ row }">{{ row.resource_type }} / {{ row.resource_id }}</template>
        </ElTableColumn>
        <ElTableColumn label="Request ID" min-width="250">
          <template #default="{ row }"><BizCopyText :value="row.request_id" /></template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }"><ElButton link type="primary" @click="showDetail(row)">详情</ElButton></template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-16px flex justify-end">
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @update:current-page="changePage"
          @update:page-size="changePageSize"
        />
      </div>
    </template>
  </ElCard>

  <ElDrawer v-model="detailVisible" title="审计记录详情" size="720px">
    <template v-if="selected">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="审计 ID"><BizCopyText :value="selected.id" /></ElDescriptionsItem>
        <ElDescriptionsItem label="动作">{{ selected.action }}</ElDescriptionsItem>
        <ElDescriptionsItem label="来源服务">{{ selected.source_service }}</ElDescriptionsItem>
        <ElDescriptionsItem label="操作者">{{ selected.actor_id }}（{{ selected.actor_type }}）</ElDescriptionsItem>
        <ElDescriptionsItem label="资源">{{ selected.resource_type }} / {{ selected.resource_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="Request ID"><BizCopyText :value="selected.request_id" /></ElDescriptionsItem>
        <ElDescriptionsItem label="Trace ID"><BizCopyText :value="selected.trace_id" /></ElDescriptionsItem>
        <ElDescriptionsItem label="发生时间">{{ formatPlatformDateTime(selected.occurred_at) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="记录时间">{{ formatPlatformDateTime(selected.created_at) }}</ElDescriptionsItem>
      </ElDescriptions>
      <h3 class="mb-8px mt-20px text-15px">变更前摘要</h3>
      <pre class="overflow-auto rounded bg-#f5f7fa p-12px text-12px dark:bg-#1f1f1f">{{
        summaryText(selected.before_summary)
      }}</pre>
      <h3 class="mb-8px mt-20px text-15px">变更后摘要</h3>
      <pre class="overflow-auto rounded bg-#f5f7fa p-12px text-12px dark:bg-#1f1f1f">{{
        summaryText(selected.after_summary)
      }}</pre>
    </template>
  </ElDrawer>
</template>
