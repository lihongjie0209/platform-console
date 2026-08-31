<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '../../api';
import { changeDefinitionStatus, listDefinitions, saveDefinition } from '../../api';
import { parseJSONArray } from '../../json';
defineOptions({ name: 'WorkflowCenterDefinitions' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const rows = ref<WorkflowDefinition[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const status = ref('');
const searchText = ref('');
const applicationID = ref('');
const visible = ref(false);
const saving = ref(false);
const editing = ref<WorkflowDefinition>();
const form = reactive({ key: '', name: '', description: '', applicationID: '', nodes: '[]', edges: '[]' });
async function loadData() {
  if (!tenantID.value) return;
  loading.value = true;
  try {
    const result = await listDefinitions({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
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
function openCreate() {
  editing.value = undefined;
  Object.assign(form, {
    key: '',
    name: '',
    description: '',
    applicationID: '',
    nodes: '[\n  {"id":"start","name":"开始","type":"start"},\n  {"id":"end","name":"结束","type":"end"}\n]',
    edges: '[{"from_node_id":"start","to_node_id":"end","priority":0}]'
  });
  visible.value = true;
}
function openEdit(row: WorkflowDefinition) {
  editing.value = row;
  Object.assign(form, {
    key: row.key,
    name: row.name,
    description: row.description || '',
    applicationID: row.application_id,
    nodes: JSON.stringify(row.nodes, null, 2),
    edges: JSON.stringify(row.edges, null, 2)
  });
  visible.value = true;
}
async function save() {
  if (!tenantID.value) return;
  let nodes: WorkflowNode[];
  let edges: WorkflowEdge[];
  try {
    nodes = parseJSONArray(form.nodes, '节点');
    edges = parseJSONArray(form.edges, '连线');
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '定义 JSON 错误');
    return;
  }
  saving.value = true;
  try {
    await saveDefinition(editing.value, {
      tenantID: tenantID.value,
      applicationID: form.applicationID,
      key: form.key,
      name: form.name,
      description: form.description,
      nodes,
      edges
    });
    visible.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}
async function changeStatus(row: WorkflowDefinition, action: 'publish' | 'disable') {
  await changeDefinitionStatus(row, action);
  window.$message?.success(action === 'publish' ? '工作流已发布' : '工作流已停用');
  await loadData();
}
watch(tenantID, search);
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">流程定义</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            维护流程草稿、节点连线及不可变发布版本；服务任务通过动态 gRPC 执行。
          </p>
        </div>
        <ElButton type="primary" :disabled="!tenantID" @click="openCreate">新建流程</ElButton>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先选择租户" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline class="mb-16px">
        <ElFormItem label="搜索"><ElInput v-model="searchText" clearable /></ElFormItem>
        <ElFormItem label="应用 ID"><ElInput v-model="applicationID" clearable /></ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-140px">
            <ElOption v-for="value in ['draft', 'published', 'disabled']" :key="value" :label="value" :value="value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="key" label="Key" min-width="180" />
        <ElTableColumn prop="name" label="名称" min-width="160" />
        <ElTableColumn prop="application_id" label="应用 ID" min-width="180" />
        <ElTableColumn prop="status" label="状态" width="110" />
        <ElTableColumn prop="published_revision" label="发布修订" width="110" />
        <ElTableColumn label="节点/连线" width="110">
          <template #default="{ row }">{{ row.nodes.length }}/{{ row.edges.length }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="190">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton v-if="row.status === 'draft'" link type="primary" @click="changeStatus(row, 'publish')">
              发布
            </ElButton>
            <ElButton v-if="row.status === 'published'" link type="danger" @click="changeStatus(row, 'disable')">
              停用
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
    </template>
  </ElCard>
  <ElDialog v-model="visible" :title="editing ? '编辑流程' : '新建流程'" width="900px">
    <ElForm label-width="100px">
      <ElFormItem label="Key" required><ElInput v-model="form.key" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="名称" required><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="应用 ID" required><ElInput v-model="form.applicationID" /></ElFormItem>
      <ElFormItem label="说明"><ElInput v-model="form.description" /></ElFormItem>
      <ElFormItem label="节点 JSON" required><ElInput v-model="form.nodes" type="textarea" :rows="11" /></ElFormItem>
      <ElFormItem label="连线 JSON" required><ElInput v-model="form.edges" type="textarea" :rows="7" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>
</template>
