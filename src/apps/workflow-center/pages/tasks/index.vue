<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import type { WorkflowTask } from '../../api';
import { claimTask, completeTask, delegateTask, listTasks } from '../../api';
import { parseJSONObject } from '../../json';
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
const form = reactive({ decision: 'approved', comment: '', output: '{}' });
const delegation = reactive({ userID: '', reason: '' });
async function loadData() {
  if (!scopeReady.value) return;
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
async function claim(row: WorkflowTask) {
  await claimTask(row);
  await loadData();
}
function openComplete(row: WorkflowTask) {
  selected.value = row;
  Object.assign(form, { decision: 'approved', comment: '', output: '{}' });
  completeVisible.value = true;
}
async function complete() {
  if (!selected.value) return;
  let output: Record<string, unknown>;
  try {
    output = parseJSONObject(form.output, '任务输出');
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '输出错误');
    return;
  }
  await completeTask(selected.value, { decision: form.decision, comment: form.comment, output });
  completeVisible.value = false;
  await loadData();
}
function openDelegate(row: WorkflowTask) {
  selected.value = row;
  Object.assign(delegation, { userID: '', reason: '' });
  delegateVisible.value = true;
}
async function delegate() {
  if (!selected.value) return;
  await delegateTask(selected.value, delegation.userID, delegation.reason);
  delegateVisible.value = false;
  await loadData();
}
watch([tenantID, applicationID], search);
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
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" />
        <ElTableColumn prop="name" label="任务" min-width="180" />
        <ElTableColumn prop="assignee" label="候选人/角色" min-width="150" />
        <ElTableColumn prop="claimed_by" label="领取人" min-width="150" />
        <ElTableColumn prop="status" label="状态" width="110" />
        <ElTableColumn prop="due_at" label="截止时间" min-width="180" />
        <ElTableColumn label="操作" width="190">
          <template #default="{ row }">
            <ElButton v-if="row.status === 'pending'" link type="primary" @click="claim(row)">领取</ElButton>
            <ElButton v-if="['pending', 'claimed'].includes(row.status)" link type="primary" @click="openComplete(row)">
              处理
            </ElButton>
            <ElButton v-if="['pending', 'claimed'].includes(row.status)" link type="primary" @click="openDelegate(row)">
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
      <ElButton @click="completeVisible = false">取消</ElButton>
      <ElButton type="primary" @click="complete">提交</ElButton>
    </template>
  </ElDialog>
  <ElDialog v-model="delegateVisible" title="转交任务" width="560px">
    <ElForm label-width="90px">
      <ElFormItem label="用户 ID"><ElInput v-model="delegation.userID" /></ElFormItem>
      <ElFormItem label="原因"><ElInput v-model="delegation.reason" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="delegateVisible = false">取消</ElButton>
      <ElButton type="primary" @click="delegate">转交</ElButton>
    </template>
  </ElDialog>
</template>
