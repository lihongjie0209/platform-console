<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformDateTime, formatPlatformTableDateTime } from '@/platform/date-time';
import { ensureIdempotencyKey } from '@/platform/idempotency-key';
import { promptUserInput } from '@/platform/user-action';
import type { WorkflowInstance, WorkflowTaskHistory } from '../../api';
import { cancelInstance, getInstance, listInstanceTaskHistory, listInstances, startInstance } from '../../api';
import { parseJSONObject } from '../../json';
defineOptions({ name: 'WorkflowCenterInstances' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<WorkflowInstance[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const status = ref('');
const searchText = ref('');
const definitionID = ref('');
const visible = ref(false);
const detail = ref<WorkflowInstance>();
const detailVisible = ref(false);
const detailLoading = ref(false);
const history = ref<WorkflowTaskHistory[]>([]);
const historyPage = ref(1);
const historyPageSize = ref(20);
const historyTotal = ref(0);
const form = reactive({ definitionKey: '', businessKey: '', title: '', variables: '{}', idempotencyKey: '' });
const loadGuard = createLatestRequestGuard();
const canStart = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.instance.start' }));
const canCancel = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.instance.cancel' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.instance.read' }));
async function loadData() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await listInstances({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      definitionID: definitionID.value,
      status: status.value,
      search: searchText.value,
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
function openStart() {
  if (!canStart.value) return;
  Object.assign(form, {
    definitionKey: '',
    businessKey: '',
    title: '',
    variables: '{}',
    idempotencyKey: crypto.randomUUID()
  });
  visible.value = true;
}
async function start() {
  if (!canStart.value || !scopeReady.value) return;
  let variables: Record<string, unknown>;
  try {
    variables = parseJSONObject(form.variables, '流程变量');
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '变量错误');
    return;
  }
  await startInstance({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    definitionKey: form.definitionKey,
    businessKey: form.businessKey,
    title: form.title,
    variables,
    idempotencyKey: ensureIdempotencyKey(form.idempotencyKey)
  });
  visible.value = false;
  await loadData();
}
async function cancel(row: WorkflowInstance) {
  if (!canCancel.value || !canRead.value) return;
  const reason = await promptUserInput(() =>
    ElMessageBox.prompt('请输入取消原因', '取消流程', {
      inputPattern: /\S+/,
      inputErrorMessage: '取消原因不能为空',
      type: 'warning'
    })
  );
  if (!reason) return;
  const current = await getInstance(row);
  await cancelInstance(current, reason);
  await loadData();
}
async function loadHistory() {
  if (!detail.value) return;
  const result = await listInstanceTaskHistory({
    tenantID: detail.value.tenant_id,
    applicationID: detail.value.application_id,
    instanceID: detail.value.id,
    page: historyPage.value,
    pageSize: historyPageSize.value
  });
  history.value = result.items || [];
  historyTotal.value = result.total || 0;
}
async function show(row: WorkflowInstance) {
  if (!canRead.value) return;
  detailVisible.value = true;
  detailLoading.value = true;
  history.value = [];
  historyTotal.value = 0;
  historyPage.value = 1;
  try {
    detail.value = await getInstance(row);
    await loadHistory();
  } finally {
    detailLoading.value = false;
  }
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  visible.value = false;
  detail.value = undefined;
  history.value = [];
  detailVisible.value = false;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">流程实例</h2>
          <p class="mb-0 mt-6px text-13px text-#999">{{ applicationName }} · 启动、跟踪和取消持久工作流实例。</p>
        </div>
        <ElButton v-if="canStart" type="primary" :disabled="!scopeReady" @click="openStart">启动流程</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="搜索"><ElInput v-model="searchText" /></ElFormItem>
        <ElFormItem label="定义 ID"><ElInput v-model="definitionID" /></ElFormItem>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border>
        <ElTableColumn prop="started_at" label="开始时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn prop="title" label="标题" min-width="180" />
        <ElTableColumn prop="business_key" label="业务键" min-width="160" />
        <ElTableColumn prop="status" label="状态" width="110" />
        <ElTableColumn prop="current_node_id" label="当前节点" min-width="130" />
        <ElTableColumn prop="starter_id" label="发起人" min-width="150" />
        <ElTableColumn label="操作" width="130">
          <template #default="{ row }">
            <ElButton v-if="canRead" link type="primary" @click="show(row)">详情</ElButton>
            <ElButton v-if="canCancel && canRead && row.status === 'running'" link type="danger" @click="cancel(row)">
              取消
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-16px flex justify-end">
        <ElPagination
          background
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          @update:current-page="
            value => {
              page = value;
              loadData();
            }
          "
        />
      </div>
    </template>
  </ElCard>
  <ElDialog v-model="visible" title="启动流程" width="650px">
    <ElForm label-width="110px">
      <ElFormItem label="流程 Key" required><ElInput v-model="form.definitionKey" /></ElFormItem>
      <ElFormItem label="业务键" required><ElInput v-model="form.businessKey" /></ElFormItem>
      <ElFormItem label="标题" required><ElInput v-model="form.title" /></ElFormItem>
      <ElFormItem label="变量 JSON"><ElInput v-model="form.variables" type="textarea" :rows="7" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="canStart" type="primary" @click="start">启动</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="detailVisible" title="实例详情" size="760px">
    <div v-loading="detailLoading">
      <ElDescriptions v-if="detail" :column="1" border>
        <ElDescriptionsItem label="实例 ID">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">{{ detail.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="变量">
          <pre>{{ JSON.stringify(detail.variables_json, null, 2) }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="结果">
          <pre>{{ JSON.stringify(detail.result_json, null, 2) }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="错误">{{ detail.error_code }} {{ detail.error_message }}</ElDescriptionsItem>
      </ElDescriptions>
      <h3 class="mb-12px mt-20px">任务处理轨迹</h3>
      <ElTimeline v-if="history.length">
        <ElTimelineItem
          v-for="item in history"
          :key="item.id"
          :timestamp="formatPlatformDateTime(item.created_at)"
          placement="top"
        >
          <div class="font-medium">{{ item.action }} · {{ item.from_status }} → {{ item.to_status }}</div>
          <div class="mt-4px text-13px text-#999">操作者：{{ item.actor_id }}</div>
          <pre v-if="Object.keys(item.detail_json || {}).length" class="mt-8px">{{
            JSON.stringify(item.detail_json, null, 2)
          }}</pre>
        </ElTimelineItem>
      </ElTimeline>
      <ElEmpty v-else description="暂无任务处理记录" :image-size="72" />
      <div v-if="historyTotal > historyPageSize" class="flex justify-end">
        <ElPagination
          small
          layout="total, prev, pager, next"
          :total="historyTotal"
          :current-page="historyPage"
          :page-size="historyPageSize"
          @update:current-page="
            value => {
              historyPage = value;
              loadHistory();
            }
          "
        />
      </div>
    </div>
  </ElDrawer>
</template>
