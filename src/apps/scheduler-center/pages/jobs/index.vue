<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { JobExecution, JobInput, ScheduledJob } from '../../api';
import { createJob, deleteJob, listExecutions, listJobs, triggerJob, updateJob } from '../../api';
import { normalizeRequestJSON } from '../../request-json';

defineOptions({ name: 'SchedulerCenterJobs' });

const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const loading = ref(false);
const saving = ref(false);
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
  if (!tenantID.value || !applicationID.value) {
    rows.value = [];
    total.value = 0;
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
    rows.value = result.items || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}
function openCreate() {
  if (!tenantID.value || !applicationID.value) return;
  editing.value = undefined;
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
function openEdit(row: ScheduledJob) {
  editing.value = row;
  Object.assign(form, {
    name: row.name,
    cronExpression: row.cron_expression,
    timezone: row.timezone,
    upstream: row.upstream,
    fullMethod: row.full_method,
    requestJSON: row.request_json,
    timeoutMilliseconds: row.timeout_milliseconds,
    enabled: row.status === 'enabled'
  });
  formVisible.value = true;
}
async function save() {
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
    if (editing.value) await updateJob(editing.value, input);
    else await createJob({ tenantID: tenantID.value, applicationID: applicationID.value }, input);
    formVisible.value = false;
    window.$message?.success(editing.value ? '任务已更新' : '任务已创建');
    await loadData();
  } finally {
    saving.value = false;
  }
}
async function remove(row: ScheduledJob) {
  await ElMessageBox.confirm(`确认删除调度任务“${row.name}”吗？`, '删除任务', { type: 'warning' });
  await deleteJob(row);
  window.$message?.success('任务已删除');
  await loadData();
}
async function trigger(row: ScheduledJob) {
  try {
    const result = await triggerJob(row.id);
    window.$message?.success(`执行完成：${result.status}`);
  } catch {
    window.$message?.warning('触发已返回失败，请在执行记录中查看详情');
  }
  if (selectedJob.value?.id === row.id) await loadExecutions();
}
async function loadExecutions() {
  if (!selectedJob.value) return;
  executionLoading.value = true;
  try {
    const result = await listExecutions(selectedJob.value.id, executionPage.value, 20);
    executionRows.value = result.items || [];
    executionTotal.value = result.total || 0;
  } finally {
    executionLoading.value = false;
  }
}
function showExecutions(row: ScheduledJob) {
  selectedJob.value = row;
  executionPage.value = 1;
  executionsVisible.value = true;
  loadExecutions();
}
function showExecution(row: JobExecution) {
  executionDetail.value = row;
  executionDetailVisible.value = true;
}
watch([tenantID, applicationID], () => {
  page.value = 1;
  rows.value = [];
  total.value = 0;
  formVisible.value = false;
  executionsVisible.value = false;
  selectedJob.value = undefined;
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
        <ElButton type="primary" :disabled="!tenantID || !applicationID" @click="openCreate">新建任务</ElButton>
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
          <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
          <ElButton link type="primary" @click="trigger(row)">立即执行</ElButton>
          <ElButton link type="primary" @click="showExecutions(row)">记录</ElButton>
          <ElButton link type="danger" @click="remove(row)">删除</ElButton>
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
      <ElButton type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>

  <ElDrawer v-model="executionsVisible" :title="`${selectedJob?.name || ''} · 执行记录`" size="820px">
    <ElTable v-loading="executionLoading" :data="executionRows" border>
      <ElTableColumn prop="started_at" label="开始时间" min-width="180" />
      <ElTableColumn prop="trigger_type" label="触发" width="100" />
      <ElTableColumn prop="status" label="状态" width="110" />
      <ElTableColumn prop="duration_milliseconds" label="耗时(ms)" width="110" />
      <ElTableColumn prop="error_code" label="错误码" width="130" />
      <ElTableColumn label="操作" width="80">
        <template #default="{ row }">
          <ElButton link type="primary" @click="showExecution(row)">详情</ElButton>
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
