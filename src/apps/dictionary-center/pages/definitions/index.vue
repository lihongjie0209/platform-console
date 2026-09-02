<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { confirmUserAction, promptUserInput } from '@/platform/user-action';
import type { DictionaryDefinition, DictionaryItem } from '../../api';
import {
  createDefinition,
  deleteItem,
  listDefinitions,
  listDraftItems,
  publishDefinition,
  queryDictionary,
  updateDefinition,
  upsertItem
} from '../../api';
import { parseJSONObject } from '../../json';

defineOptions({ name: 'DictionaryCenterDefinitions' });
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<DictionaryDefinition[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const status = ref('');
const keyword = ref('');
const formVisible = ref(false);
const saving = ref(false);
const editing = ref<DictionaryDefinition>();
const form = reactive({ code: '', name: '', description: '', status: 'draft', metadata: '{}' });
const itemsVisible = ref(false);
const selected = ref<DictionaryDefinition>();
const items = ref<DictionaryItem[]>([]);
const itemVisible = ref(false);
const editingItem = ref<DictionaryItem>();
const itemForm = reactive({
  code: '',
  name: '',
  parentID: '',
  parentCode: '',
  status: 'active',
  metadata: '{}',
  leaf: true,
  disabled: false,
  sortOrder: 0
});
const previewVisible = ref(false);
const previewKeyword = ref('');
const previewItems = ref<DictionaryItem[]>([]);
const previewTotal = ref(0);
const previewPage = ref(1);
const previewPageSize = ref(20);
const loadGuard = createLatestRequestGuard();
const itemsGuard = createLatestRequestGuard();
const previewGuard = createLatestRequestGuard();
const canCreate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.create' })
);
const canUpdate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.update' })
);
const canListItems = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.list' }));
const canUpdateItems = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.update' })
);
const canDeleteItems = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.delete' })
);
const canPublish = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.publish' })
);
const canQuery = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.data.query' }));

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
    const result = await listDefinitions({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      status: status.value,
      keyword: keyword.value,
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
  if (!canCreate.value || !scopeReady.value) return;
  editing.value = undefined;
  Object.assign(form, { code: '', name: '', description: '', status: 'draft', metadata: '{}' });
  formVisible.value = true;
}
function openEdit(row: DictionaryDefinition) {
  if (!canUpdate.value) return;
  editing.value = row;
  Object.assign(form, {
    code: row.code,
    name: row.name,
    description: row.description || '',
    status: row.status,
    metadata: JSON.stringify(row.metadata_json || {}, null, 2)
  });
  formVisible.value = true;
}
async function save() {
  if ((editing.value && !canUpdate.value) || (!editing.value && !canCreate.value) || !scopeReady.value) return;
  let metadata: Record<string, unknown>;
  try {
    metadata = parseJSONObject(form.metadata);
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '元数据错误');
    return;
  }
  saving.value = true;
  try {
    if (editing.value)
      await updateDefinition(editing.value, {
        name: form.name,
        description: form.description,
        status: form.status,
        metadata
      });
    else
      await createDefinition({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        code: form.code,
        name: form.name,
        description: form.description,
        metadata
      });
    formVisible.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}
async function openItems(row: DictionaryDefinition) {
  if (!canListItems.value) return;
  const request = itemsGuard.begin();
  selected.value = row;
  itemsVisible.value = true;
  const result = await listDraftItems(row.id);
  if (itemsGuard.isCurrent(request) && selected.value?.id === row.id) items.value = result.items || [];
}
function openNewItem() {
  if (!canUpdateItems.value) return;
  editingItem.value = undefined;
  Object.assign(itemForm, {
    code: '',
    name: '',
    parentID: '',
    parentCode: '',
    status: 'active',
    metadata: '{}',
    leaf: true,
    disabled: false,
    sortOrder: 0
  });
  itemVisible.value = true;
}
function editItem(row: DictionaryItem) {
  if (!canUpdateItems.value) return;
  editingItem.value = row;
  Object.assign(itemForm, {
    code: row.code,
    name: row.name,
    parentID: row.parent_id || '',
    parentCode: row.parent_code || '',
    status: row.status,
    metadata: JSON.stringify(row.metadata_json || {}, null, 2),
    leaf: row.leaf,
    disabled: row.disabled,
    sortOrder: row.sort_order
  });
  itemVisible.value = true;
}
async function saveItem() {
  if (!canUpdateItems.value || !selected.value) return;
  let metadata: Record<string, unknown>;
  try {
    metadata = parseJSONObject(itemForm.metadata);
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '元数据错误');
    return;
  }
  await upsertItem(selected.value.id, {
    ...editingItem.value,
    code: itemForm.code,
    name: itemForm.name,
    parent_id: itemForm.parentID,
    parent_code: itemForm.parentCode,
    status: itemForm.status,
    metadata_json: metadata,
    leaf: itemForm.leaf,
    disabled: itemForm.disabled,
    sort_order: itemForm.sortOrder
  });
  itemVisible.value = false;
  await openItems(selected.value);
}
async function removeItem(row: DictionaryItem) {
  if (!canDeleteItems.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`确认删除条目“${row.name}”吗？`, '删除条目', { type: 'warning' })
  );
  if (!confirmed) return;
  await deleteItem(row);
  if (selected.value) await openItems(selected.value);
}
async function publish(row: DictionaryDefinition) {
  if (!canPublish.value) return;
  const comment = await promptUserInput(() => ElMessageBox.prompt('请输入发布说明', '发布字典', { inputValue: '' }));
  if (comment === undefined) return;
  await publishDefinition(row, comment);
  window.$message?.success('字典版本已发布');
  await loadData();
}
async function loadPreview(row: DictionaryDefinition) {
  if (!canQuery.value || !scopeReady.value) return;
  const request = previewGuard.begin();
  selected.value = row;
  previewVisible.value = true;
  const result = await queryDictionary({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    dictionaryCode: row.code,
    keyword: previewKeyword.value,
    page: previewPage.value,
    pageSize: previewPageSize.value
  });
  if (previewGuard.isCurrent(request) && selected.value?.id === row.id) {
    previewItems.value = result.items || [];
    previewTotal.value = result.total || 0;
  }
}
function preview(row: DictionaryDefinition) {
  previewPage.value = 1;
  loadPreview(row);
}
function reloadPreview() {
  if (selected.value) loadPreview(selected.value);
}
function resizePreview() {
  previewPage.value = 1;
  reloadPreview();
}
watch([tenantID, applicationID], () => {
  itemsGuard.invalidate();
  previewGuard.invalidate();
  rows.value = [];
  total.value = 0;
  formVisible.value = false;
  itemsVisible.value = false;
  itemVisible.value = false;
  previewVisible.value = false;
  selected.value = undefined;
  items.value = [];
  previewItems.value = [];
  previewTotal.value = 0;
  previewPage.value = 1;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">字典定义</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            维护 {{ applicationName }} 的静态字典覆盖、不可变发布版本，并验证统一查询入口。
          </p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="openCreate">新建字典</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline class="mb-16px">
        <ElFormItem label="关键词"><ElInput v-model="keyword" clearable /></ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-140px">
            <ElOption v-for="value in ['draft', 'active', 'disabled']" :key="value" :label="value" :value="value" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="code" label="编码" min-width="180" />
        <ElTableColumn prop="name" label="名称" min-width="160" />
        <ElTableColumn prop="kind" label="类型" width="100" />
        <ElTableColumn prop="status" label="状态" width="100" />
        <ElTableColumn prop="published_version" label="发布版本" width="110" />
        <ElTableColumn prop="updated_at" label="更新时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <ElButton v-if="canUpdate" link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton v-if="canListItems && row.kind === 'static'" link type="primary" @click="openItems(row)">
              条目
            </ElButton>
            <ElButton v-if="canPublish && row.kind === 'static'" link type="primary" @click="publish(row)">
              发布
            </ElButton>
            <ElButton v-if="canQuery" link type="primary" @click="preview(row)">查询验证</ElButton>
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
  <ElDialog v-model="formVisible" :title="editing ? '编辑字典' : '新建字典'" width="680px">
    <ElForm label-width="100px">
      <ElFormItem label="编码" required><ElInput v-model="form.code" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="名称" required><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="说明"><ElInput v-model="form.description" type="textarea" /></ElFormItem>
      <ElFormItem v-if="editing" label="状态">
        <ElSelect v-model="form.status">
          <ElOption v-for="value in ['draft', 'active', 'disabled']" :key="value" :label="value" :value="value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="元数据"><ElInput v-model="form.metadata" type="textarea" :rows="5" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="formVisible = false">取消</ElButton>
      <ElButton v-if="editing ? canUpdate : canCreate" type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="itemsVisible" :title="`${selected?.name || ''} · 草稿条目`" size="900px">
    <div class="mb-12px text-right">
      <ElButton v-if="canUpdateItems" type="primary" @click="openNewItem">新增条目</ElButton>
    </div>
    <ElTable :data="items" border>
      <ElTableColumn prop="code" label="编码" />
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="parent_code" label="父编码" />
      <ElTableColumn prop="status" label="状态" width="100" />
      <ElTableColumn prop="sort_order" label="排序" width="80" />
      <ElTableColumn label="操作" width="130">
        <template #default="{ row }">
          <ElButton v-if="canUpdateItems" link type="primary" @click="editItem(row)">编辑</ElButton>
          <ElButton v-if="canDeleteItems" link type="danger" @click="removeItem(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElDrawer>
  <ElDialog v-model="itemVisible" :title="editingItem ? '编辑条目' : '新增条目'" width="650px">
    <ElForm label-width="100px">
      <ElFormItem label="编码" required><ElInput v-model="itemForm.code" /></ElFormItem>
      <ElFormItem label="名称" required><ElInput v-model="itemForm.name" /></ElFormItem>
      <ElFormItem label="父条目 ID"><ElInput v-model="itemForm.parentID" /></ElFormItem>
      <ElFormItem label="父编码"><ElInput v-model="itemForm.parentCode" /></ElFormItem>
      <ElFormItem label="状态"><ElInput v-model="itemForm.status" /></ElFormItem>
      <ElFormItem label="排序"><ElInputNumber v-model="itemForm.sortOrder" /></ElFormItem>
      <ElFormItem label="元数据"><ElInput v-model="itemForm.metadata" type="textarea" :rows="4" /></ElFormItem>
      <ElFormItem label="叶节点"><ElSwitch v-model="itemForm.leaf" /></ElFormItem>
      <ElFormItem label="禁用"><ElSwitch v-model="itemForm.disabled" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="itemVisible = false">取消</ElButton>
      <ElButton v-if="canUpdateItems" type="primary" @click="saveItem">保存</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="previewVisible" :title="`${selected?.name || ''} · 查询验证`" size="720px">
    <div class="mb-12px flex gap-8px">
      <ElInput v-model="previewKeyword" clearable placeholder="搜索关键词" />
      <ElButton v-if="canQuery" type="primary" @click="selected && preview(selected)">查询</ElButton>
    </div>
    <ElTable :data="previewItems" border>
      <ElTableColumn prop="code" label="编码" />
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="parent_code" label="父编码" />
      <ElTableColumn prop="disabled" label="禁用" width="80" />
    </ElTable>
    <div class="mt-16px flex justify-end">
      <ElPagination
        v-model:current-page="previewPage"
        v-model:page-size="previewPageSize"
        :total="previewTotal"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="reloadPreview"
        @size-change="resizePreview"
      />
    </div>
  </ElDrawer>
</template>
