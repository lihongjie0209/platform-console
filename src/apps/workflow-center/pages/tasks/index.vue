<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformDateTime, formatPlatformTableDateTime } from '@/platform/date-time';
import { operationIdempotencyKey, operationPromise } from '@/platform/idempotency-key';
import { useKeyedAsyncAction } from '@/platform/keyed-async-action';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import type { WorkflowTask, WorkflowTaskHistory } from '../../api';
import { claimTask, completeTask, delegateTask, getTask, listTaskHistory, listTasks } from '../../api';
import { parseJSONObject } from '../../json';
import { isTaskActionable } from '../../mutation';
defineOptions({ name: 'WorkflowCenterTasks' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<WorkflowTask[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const status = ref('');
const searchText = ref('');
const instanceID = ref('');
const selected = ref<WorkflowTask>();
const completeVisible = ref(false);
const delegateVisible = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<WorkflowTask>();
const history = ref<WorkflowTaskHistory[]>([]);
const historyPage = ref(1);
const historyPageSize = ref(20);
const historyTotal = ref(0);
const form = reactive({ decision: 'approved', comment: '', output: '{}' });
const delegation = reactive({ userID: '', reason: '' });
const loadGuard = createLatestRequestGuard();
const { active: activeAction, run: runAction } = useKeyedAsyncAction();
const claimKeys = new Map<string, string>();
const claimBaselines = new Map<string, Promise<WorkflowTask>>();
const completeKeys = new Map<string, string>();
const delegateKeys = new Map<string, string>();
const canClaim = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.task.claim' }));
const canComplete = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.task.complete' }));
const canDelegate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.task.delegate' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'workflow.task.read' }));
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
    const result = await listTasks({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      instanceID: instanceID.value,
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
async function claim(row: WorkflowTask) {
  if (!canClaim.value || !canRead.value) return;
  await runAction(`${row.id}:claim`, async () => {
    const operation = `claim:${row.id}:${row.version}`;
    const current = await operationPromise(claimBaselines, operation, async () => {
      const value = await getTask(row);
      if (
        hasPersistedVersionChanged(row.version, value.version) ||
        hasPersistedStateChanged(row.status, value.status) ||
        value.status !== 'pending'
      ) {
        throw new Error('任务状态已变化，请确认最新状态后重试');
      }
      return value;
    });
    await claimTask(current, operationIdempotencyKey(claimKeys, operation));
    claimBaselines.delete(operation);
    claimKeys.delete(operation);
    await loadData();
  });
}
async function loadHistory() {
  if (!detail.value) return;
  const result = await listTaskHistory({
    tenantID: detail.value.tenant_id,
    applicationID: detail.value.application_id,
    taskID: detail.value.id,
    page: historyPage.value,
    pageSize: historyPageSize.value
  });
  history.value = result.items || [];
  historyTotal.value = result.total || 0;
}
async function showDetail(row: WorkflowTask) {
  if (!canRead.value) return;
  detailVisible.value = true;
  detailLoading.value = true;
  history.value = [];
  historyTotal.value = 0;
  historyPage.value = 1;
  try {
    detail.value = await getTask(row);
    await loadHistory();
  } finally {
    detailLoading.value = false;
  }
}
async function openComplete(row: WorkflowTask) {
  if (!canComplete.value || !canRead.value) return;
  await runAction(`${row.id}:open-complete`, async () => {
    const current = await getTask(row);
    if (!isTaskActionable(current.status)) {
      window.$message?.warning('任务已无法处理，请确认最新状态');
      await loadData();
      return;
    }
    selected.value = current;
    completeKeys.clear();
    Object.assign(form, { decision: 'approved', comment: '', output: '{}' });
    completeVisible.value = true;
  });
}
async function complete() {
  if (!canComplete.value || !selected.value) return;
  let output: Record<string, unknown>;
  try {
    output = parseJSONObject(form.output, '任务输出');
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '输出错误');
    return;
  }
  const task = selected.value;
  await runAction(`${task.id}:complete`, async () => {
    const input = { decision: form.decision, comment: form.comment, output };
    const operation = JSON.stringify(['complete', task.id, task.version, input]);
    await completeTask(task, input, operationIdempotencyKey(completeKeys, operation));
    completeKeys.clear();
    completeVisible.value = false;
    await loadData();
  });
}
async function openDelegate(row: WorkflowTask) {
  if (!canDelegate.value || !canRead.value) return;
  await runAction(`${row.id}:open-delegate`, async () => {
    const current = await getTask(row);
    if (!isTaskActionable(current.status)) {
      window.$message?.warning('任务已无法转交，请确认最新状态');
      await loadData();
      return;
    }
    selected.value = current;
    delegateKeys.clear();
    Object.assign(delegation, { userID: '', reason: '' });
    delegateVisible.value = true;
  });
}
async function delegate() {
  if (!canDelegate.value || !selected.value) return;
  const task = selected.value;
  await runAction(`${task.id}:delegate`, async () => {
    const input = { delegateTo: delegation.userID, reason: delegation.reason };
    const operation = JSON.stringify(['delegate', task.id, task.version, input]);
    await delegateTask(task, input, operationIdempotencyKey(delegateKeys, operation));
    delegateKeys.clear();
    delegateVisible.value = false;
    detailVisible.value = false;
    detail.value = undefined;
    history.value = [];
    await loadData();
  });
}
watch([tenantID, applicationID], () => {
  claimKeys.clear();
  claimBaselines.clear();
  completeKeys.clear();
  delegateKeys.clear();
  rows.value = [];
  total.value = 0;
  selected.value = undefined;
  completeVisible.value = false;
  delegateVisible.value = false;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div>
        <h2 class="m-0 text-18px font-semibold">我的任务</h2>
        <p class="mb-0 mt-6px text-13px text-#999">
          {{ applicationName }} · 任务可见性由后端根据用户、成员关系和授权角色计算，前端不提交可信角色。
        </p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="搜索"><ElInput v-model="searchText" /></ElFormItem>
        <ElFormItem label="实例 ID"><ElInput v-model="instanceID" /></ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-140px">
            <ElOption
              v-for="value in ['pending', 'claimed', 'completed', 'cancelled']"
              :key="value"
              :label="value"
              :value="value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border>
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn prop="name" label="任务" min-width="180" />
        <ElTableColumn prop="assignee" label="候选人/角色" min-width="150" />
        <ElTableColumn prop="claimed_by" label="领取人" min-width="150" />
        <ElTableColumn prop="status" label="状态" width="110" />
        <ElTableColumn prop="due_at" label="截止时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="240">
          <template #default="{ row }">
            <ElButton v-if="canRead" link type="primary" @click="showDetail(row)">详情</ElButton>
            <ElButton
              v-if="canClaim && canRead && row.status === 'pending'"
              link
              type="primary"
              :loading="activeAction === `${row.id}:claim`"
              :disabled="Boolean(activeAction)"
              @click="claim(row)"
            >
              领取
            </ElButton>
            <ElButton
              v-if="canComplete && canRead && ['pending', 'claimed'].includes(row.status)"
              link
              type="primary"
              :loading="activeAction === `${row.id}:open-complete`"
              :disabled="Boolean(activeAction)"
              @click="openComplete(row)"
            >
              处理
            </ElButton>
            <ElButton
              v-if="canDelegate && canRead && ['pending', 'claimed'].includes(row.status)"
              link
              type="primary"
              :loading="activeAction === `${row.id}:open-delegate`"
              :disabled="Boolean(activeAction)"
              @click="openDelegate(row)"
            >
              转交
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
  <ElDialog v-model="completeVisible" title="处理任务" width="650px">
    <ElForm label-width="90px">
      <ElFormItem label="决定">
        <ElSelect v-model="form.decision">
          <ElOption label="通过" value="approved" />
          <ElOption label="拒绝" value="rejected" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="意见"><ElInput v-model="form.comment" type="textarea" /></ElFormItem>
      <ElFormItem label="输出 JSON"><ElInput v-model="form.output" type="textarea" :rows="6" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="Boolean(activeAction)" @click="completeVisible = false">取消</ElButton>
      <ElButton
        v-if="canComplete"
        type="primary"
        :loading="activeAction === `${selected?.id}:complete`"
        @click="complete"
      >
        提交
      </ElButton>
    </template>
  </ElDialog>
  <ElDialog v-model="delegateVisible" title="转交任务" width="560px">
    <ElForm label-width="90px">
      <ElFormItem label="用户 ID"><ElInput v-model="delegation.userID" /></ElFormItem>
      <ElFormItem label="原因"><ElInput v-model="delegation.reason" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="Boolean(activeAction)" @click="delegateVisible = false">取消</ElButton>
      <ElButton
        v-if="canDelegate"
        type="primary"
        :loading="activeAction === `${selected?.id}:delegate`"
        @click="delegate"
      >
        转交
      </ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="detailVisible" title="任务详情" size="760px">
    <div v-loading="detailLoading">
      <ElDescriptions v-if="detail" :column="1" border>
        <ElDescriptionsItem label="任务 ID">{{ detail.id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="实例 ID">{{ detail.instance_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="节点">{{ detail.node_id }} · {{ detail.name }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">{{ detail.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="分配">{{ detail.assignee_type }} · {{ detail.assignee }}</ElDescriptionsItem>
        <ElDescriptionsItem label="领取人">{{ detail.claimed_by || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="决定">{{ detail.decision || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="意见">{{ detail.comment || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="输入">
          <pre>{{ JSON.stringify(detail.input_json, null, 2) }}</pre>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="输出">
          <pre>{{ JSON.stringify(detail.output_json, null, 2) }}</pre>
        </ElDescriptionsItem>
      </ElDescriptions>
      <h3 class="mb-12px mt-20px">处理历史</h3>
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
      <ElEmpty v-else description="暂无处理历史" :image-size="72" />
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
