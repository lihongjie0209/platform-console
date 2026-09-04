<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { operationIdempotencyKey, operationPromise } from '@/platform/idempotency-key';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import { confirmUserAction } from '@/platform/user-action';
import type { JobExecution, JobInput, ScheduledJob } from '../../api';
import { createJob, deleteJob, getExecution, getJob, listExecutions, listJobs, triggerJob, updateJob } from '../../api';
import { normalizeRequestJSON } from '../../request-json';

defineOptions({ name: 'SchedulerCenterJobs' });

const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const loading = ref(false);
const saving = ref(false);
const deletingID = ref('');
const triggeringID = ref('');
const rows = ref<ScheduledJob[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const formVisible = ref(false);
const editing = ref<ScheduledJob>();
const executionsVisible = ref(false);
const executionLoading = ref(false);
const executionRows = ref<JobExecution[]>([]);
const executionTotal = ref(0);
const executionPage = ref(1);
const selectedJob = ref<ScheduledJob>();
const executionDetail = ref<JobExecution>();
const executionDetailVisible = ref(false);
const loadGuard = createLatestRequestGuard();
const executionGuard = createLatestRequestGuard();
const formKeys = new Map<string, string>();
const deleteKeys = new Map<string, string>();
const deleteBaselines = new Map<string, Promise<ScheduledJob>>();
const triggerKeys = new Map<string, string>();
const triggerBaselines = new Map<string, Promise<ScheduledJob>>();
const canCreate = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.job.create' }));
const canRead = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.job.read' }));
const canUpdate = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.job.update' }));
const canDelete = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.job.delete' }));
const canTrigger = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.job.trigger' }));
const canListExecutions = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.execution.list' })
);
const canReadExecution = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'scheduler.execution.read' })
);
const form = reactive<JobInput>({
  name: '',
  cronExpression: '0 0 * * * *',
  timezone: 'Asia/Shanghai',
  upstream: '',
  fullMethod: '',
  requestJSON: '{}',
  timeoutMilliseconds: 30000,
  enabled: true
});

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
    const result = await listJobs({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      status: status.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (loadGuard.isCurrent(request)) {
      rows.value = result.items || [];
      total.value = result.total || 0;
    }
  } finally {
    if (loadGuard.isCurrent(request)) loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}
function openCreate() {
  if (!canCreate.value || !tenantID.value || !applicationID.value) return;
  editing.value = undefined;
  formKeys.clear();
  Object.assign(form, {
    name: '',
    cronExpression: '0 0 * * * *',
    timezone: 'Asia/Shanghai',
    upstream: '',
    fullMethod: '',
    requestJSON: '{}',
    timeoutMilliseconds: 30000,
    enabled: true
  });
  formVisible.value = true;
}
async function openEdit(row: ScheduledJob) {
  if (!canUpdate.value || !canRead.value) return;
  const current = await getJob(row.id);
  formKeys.clear();
  editing.value = current;
  Object.assign(form, {
    name: current.name,
    cronExpression: current.cron_expression,
    timezone: current.timezone,
    upstream: current.upstream,
    fullMethod: current.full_method,
    requestJSON: current.request_json,
    timeoutMilliseconds: current.timeout_milliseconds,
    enabled: current.status === 'enabled'
  });
  formVisible.value = true;
}
async function save() {
  const currentTenantID = tenantID.value;
  const currentApplicationID = applicationID.value;
  if (!currentTenantID || !currentApplicationID) return;
  if ((editing.value && !canUpdate.value) || (!editing.value && !canCreate.value)) return;
  let requestJSON: string;
  try {
    requestJSON = normalizeRequestJSON(form.requestJSON);
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '请求 JSON 错误');
    return;
  }
  saving.value = true;
  try {
    const input = { ...form, requestJSON };
    const operation = JSON.stringify(['job', editing.value?.id || '', editing.value?.version || 0, input]);
    const idempotencyKey = operationIdempotencyKey(formKeys, operation);
    if (editing.value) await updateJob(editing.value, input, idempotencyKey);
    else await createJob({ tenantID: currentTenantID, applicationID: currentApplicationID }, input, idempotencyKey);
    formKeys.clear();
    formVisible.value = false;
    window.$message?.success(editing.value ? '任务已更新' : '任务已创建');
    await loadData();
  } finally {
    saving.value = false;
  }
}
async function remove(row: ScheduledJob) {
  if (!canDelete.value || !canRead.value || deletingID.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`确认删除调度任务“${row.name}”吗？`, '删除任务', { type: 'warning' })
  );
  if (!confirmed) return;
  const operation = `delete:${row.id}:${row.version}`;
  deletingID.value = row.id;
  try {
    const current = await operationPromise(deleteBaselines, operation, async () => {
      const detail = await getJob(row.id);
      if (
        hasPersistedVersionChanged(row.version, detail.version) ||
        hasPersistedStateChanged(row.status, detail.status)
      ) {
        throw new Error('调度任务已发生变化，请刷新后重试');
      }
      return detail;
    });
    await deleteJob(current, operationIdempotencyKey(deleteKeys, operation));
    deleteBaselines.delete(operation);
    deleteKeys.delete(operation);
    window.$message?.success('任务已删除');
    await loadData();
  } finally {
    deletingID.value = '';
  }
}
async function trigger(row: ScheduledJob) {
  if (!canTrigger.value || !canRead.value || triggeringID.value) return;
  const operation = `trigger:${row.id}:${row.version}:${row.status}`;
  triggeringID.value = row.id;
  try {
    const current = await operationPromise(triggerBaselines, operation, async () => {
      const detail = await getJob(row.id);
      if (
        hasPersistedVersionChanged(row.version, detail.version) ||
        hasPersistedStateChanged(row.status, detail.status) ||
        !detail.enabled
      ) {
        throw new Error('调度任务已发生变化或已停用，请刷新后重试');
      }
      return detail;
    });
    const result = await triggerJob(current.id, operationIdempotencyKey(triggerKeys, operation));
    triggerKeys.delete(operation);
    triggerBaselines.delete(operation);
    window.$message?.success(`执行完成：${result.status}`);
  } catch {
    window.$message?.warning('触发已返回失败，请在执行记录中查看详情');
  } finally {
    triggeringID.value = '';
  }
  if (selectedJob.value?.id === row.id) await loadExecutions();
}
async function loadExecutions() {
  if (!canListExecutions.value || !selectedJob.value) return;
  const request = executionGuard.begin();
  const jobID = selectedJob.value.id;
  executionLoading.value = true;
  try {
    const result = await listExecutions(jobID, executionPage.value, 20);
    if (executionGuard.isCurrent(request) && selectedJob.value?.id === jobID) {
      executionRows.value = result.items || [];
      executionTotal.value = result.total || 0;
    }
  } finally {
    if (executionGuard.isCurrent(request)) executionLoading.value = false;
  }
}
function showExecutions(row: ScheduledJob) {
  if (!canListExecutions.value) return;
  selectedJob.value = row;
  executionPage.value = 1;
  executionRows.value = [];
  executionTotal.value = 0;
  executionDetail.value = undefined;
  executionDetailVisible.value = false;
  executionsVisible.value = true;
  loadExecutions();
}
async function showExecution(row: JobExecution) {
  if (!canReadExecution.value) return;
  executionDetailVisible.value = true;
  executionDetail.value = undefined;
  try {
    executionDetail.value = await getExecution(row.id);
  } catch (error) {
    executionDetailVisible.value = false;
    throw error;
  }
}
watch([tenantID, applicationID], () => {
  executionGuard.invalidate();
  formKeys.clear();
  deleteKeys.clear();
  deleteBaselines.clear();
  triggerKeys.clear();
  triggerBaselines.clear();
  page.value = 1;
  rows.value = [];
  total.value = 0;
  formVisible.value = false;
  executionsVisible.value = false;
  selectedJob.value = undefined;
  executionRows.value = [];
  executionTotal.value = 0;
  executionDetail.value = undefined;
  executionDetailVisible.value = false;
  executionLoading.value = false;
  loadData();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">调度任务</h2>
          <p class="mb-0 mt-6px text-13px text-#999">通过动态 gRPC 调用管理跨服务定时任务，无需生成下游 Client。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!tenantID || !applicationID" @click="openCreate">
          新建任务
        </ElButton>
      </div>
    </template>
    <ElAlert
      v-if="!tenantID || !applicationID"
      class="mb-16px"
      title="请先在应用选择页选择租户和应用"
      type="warning"
      show-icon
      :closable="false"
    />
    <ElForm inline class="mb-16px">
      <ElFormItem label="状态">
        <ElSelect v-model="status" clearable class="w-150px">
          <ElOption label="enabled" value="enabled" />
          <ElOption label="disabled" value="disabled" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="search">查询</ElButton>
        <ElButton @click="loadData">刷新</ElButton>
      </ElFormItem>
    </ElForm>
    <ElTable v-loading="loading" :data="rows" border stripe>
      <ElTableColumn prop="name" label="名称" min-width="170" />
      <ElTableColumn prop="cron_expression" label="Cron（含秒）" min-width="150" />
      <ElTableColumn prop="timezone" label="时区" width="150" />
      <ElTableColumn prop="upstream" label="上游" min-width="140" />
      <ElTableColumn prop="full_method" label="完整 RPC 方法" min-width="280" show-overflow-tooltip />
      <ElTableColumn prop="status" label="状态" width="100" />
      <ElTableColumn label="超时" width="100">
        <template #default="{ row }">{{ row.timeout_milliseconds }} ms</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <ElButton v-if="canUpdate && canRead" link type="primary" @click="openEdit(row)">编辑</ElButton>
          <ElButton
            v-if="canTrigger && canRead"
            link
            type="primary"
            :loading="triggeringID === row.id"
            :disabled="Boolean(triggeringID)"
            @click="trigger(row)"
          >
            立即执行
          </ElButton>
          <ElButton v-if="canListExecutions" link type="primary" @click="showExecutions(row)">记录</ElButton>
          <ElButton
            v-if="canDelete && canRead"
            link
            type="danger"
            :loading="deletingID === row.id"
            :disabled="Boolean(deletingID)"
            @click="remove(row)"
          >
            删除
          </ElButton>
        </template>
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
        @update:current-page="
          value => {
            page = value;
            loadData();
          }
        "
        @update:page-size="
          value => {
            page = 1;
            pageSize = value;
            loadData();
          }
        "
      />
    </div>
  </ElCard>

  <ElDialog v-model="formVisible" :title="editing ? '编辑调度任务' : '新建调度任务'" width="760px">
    <ElForm label-width="130px">
      <ElFormItem label="名称" required><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="Cron 表达式" required><ElInput v-model="form.cronExpression" /></ElFormItem>
      <ElFormItem label="时区"><ElInput v-model="form.timezone" /></ElFormItem>
      <ElFormItem label="上游注册名" required><ElInput v-model="form.upstream" /></ElFormItem>
      <ElFormItem label="完整 RPC 方法" required>
        <ElInput v-model="form.fullMethod" placeholder="/platform.example.v1.Service/Method" />
      </ElFormItem>
      <ElFormItem label="请求 JSON"><ElInput v-model="form.requestJSON" type="textarea" :rows="7" /></ElFormItem>
      <ElFormItem label="超时（毫秒）">
        <ElInputNumber v-model="form.timeoutMilliseconds" :min="100" :max="1800000" />
      </ElFormItem>
      <ElFormItem label="启用"><ElSwitch v-model="form.enabled" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="formVisible = false">取消</ElButton>
      <ElButton v-if="editing ? canUpdate : canCreate" type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>

  <ElDrawer v-model="executionsVisible" :title="`${selectedJob?.name || ''} · 执行记录`" size="820px">
    <ElTable v-loading="executionLoading" :data="executionRows" border>
      <ElTableColumn prop="started_at" label="开始时间" min-width="180" :formatter="formatPlatformTableDateTime" />
      <ElTableColumn prop="trigger_type" label="触发" width="100" />
      <ElTableColumn prop="status" label="状态" width="110" />
      <ElTableColumn prop="duration_milliseconds" label="耗时(ms)" width="110" />
      <ElTableColumn prop="error_code" label="错误码" width="130" />
      <ElTableColumn label="操作" width="80">
        <template #default="{ row }">
          <ElButton v-if="canReadExecution" link type="primary" @click="showExecution(row)">详情</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <div class="mt-16px flex justify-end">
      <ElPagination
        background
        layout="total, prev, pager, next"
        :total="executionTotal"
        :current-page="executionPage"
        :page-size="20"
        @update:current-page="
          value => {
            executionPage = value;
            loadExecutions();
          }
        "
      />
    </div>
  </ElDrawer>
  <ElDrawer v-model="executionDetailVisible" title="执行详情" size="680px">
    <ElDescriptions v-if="executionDetail" :column="1" border>
      <ElDescriptionsItem label="执行 ID">{{ executionDetail.id }}</ElDescriptionsItem>
      <ElDescriptionsItem label="状态">{{ executionDetail.status }}</ElDescriptionsItem>
      <ElDescriptionsItem label="错误">
        {{ executionDetail.error_code }} {{ executionDetail.error_message }}
      </ElDescriptionsItem>
      <ElDescriptionsItem label="响应">
        <pre class="overflow-auto whitespace-pre-wrap">{{ executionDetail.response_json || '-' }}</pre>
      </ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>
