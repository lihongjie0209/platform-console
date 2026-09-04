<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { operationIdempotencyKey, operationPromise } from '@/platform/idempotency-key';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import { confirmUserAction, promptUserInput } from '@/platform/user-action';
import type { DictionaryDefinition, DictionaryItem } from '../../api';
import {
  createDefinition,
  deleteItem,
  getDefinition,
  getItem,
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
const itemSaving = ref(false);
const mutatingItemID = ref('');
const publishingID = ref('');
const editing = ref<DictionaryDefinition>();
const form = reactive({ code: '', name: '', description: '', status: 'draft', metadata: '{}' });
const itemsVisible = ref(false);
const selected = ref<DictionaryDefinition>();
const items = ref<DictionaryItem[]>([]);
const itemsLoading = ref(false);
const itemsKeyword = ref('');
const itemsTotal = ref(0);
const itemsPage = ref(1);
const itemsPageSize = ref(20);
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
const definitionFormKeys = new Map<string, string>();
const definitionActionKeys = new Map<string, string>();
const itemKeys = new Map<string, string>();
const itemBaselines = new Map<string, Promise<DictionaryItem>>();
const definitionBaselines = new Map<string, Promise<DictionaryDefinition>>();
const canCreate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.create' })
);
const canRead = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.read' }));
const canUpdate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.definition.update' })
);
const canListItems = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.list' }));
const canUpdateItems = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.update' })
);
const canReadItem = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'dictionary.item.read' }));
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
  definitionFormKeys.clear();
  Object.assign(form, { code: '', name: '', description: '', status: 'draft', metadata: '{}' });
  formVisible.value = true;
}
async function openEdit(row: DictionaryDefinition) {
  if (!canUpdate.value || !canRead.value) return;
  const current = await getDefinition(row);
  definitionFormKeys.clear();
  editing.value = current;
  Object.assign(form, {
    code: current.code,
    name: current.name,
    description: current.description || '',
    status: current.status,
    metadata: JSON.stringify(current.metadata_json || {}, null, 2)
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
    const operation = JSON.stringify([
      'definition',
      editing.value?.id || '',
      editing.value?.version || 0,
      form,
      metadata
    ]);
    const idempotencyKey = operationIdempotencyKey(definitionFormKeys, operation);
    if (editing.value)
      await updateDefinition(
        editing.value,
        {
          name: form.name,
          description: form.description,
          status: form.status,
          metadata
        },
        idempotencyKey
      );
    else
      await createDefinition({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        code: form.code,
        name: form.name,
        description: form.description,
        metadata,
        idempotencyKey
      });
    definitionFormKeys.clear();
    formVisible.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}
async function openItems(row: DictionaryDefinition) {
  if (!canListItems.value) return;
  selected.value = row;
  itemsVisible.value = true;
  itemsKeyword.value = '';
  itemsPage.value = 1;
  await loadItems();
}
async function loadItems() {
  if (!canListItems.value || !selected.value) return;
  const request = itemsGuard.begin();
  const dictionaryID = selected.value.id;
  itemsLoading.value = true;
  try {
    const result = await listDraftItems({
      dictionaryID,
      keyword: itemsKeyword.value.trim(),
      page: itemsPage.value,
      pageSize: itemsPageSize.value
    });
    if (itemsGuard.isCurrent(request) && selected.value?.id === dictionaryID) {
      items.value = result.items || [];
      itemsTotal.value = result.total || 0;
    }
  } finally {
    if (itemsGuard.isCurrent(request)) itemsLoading.value = false;
  }
}
function searchItems() {
  itemsPage.value = 1;
  loadItems();
}
function resizeItems() {
  itemsPage.value = 1;
  loadItems();
}
function openNewItem() {
  if (!canUpdateItems.value) return;
  editingItem.value = undefined;
  itemKeys.clear();
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
async function editItem(row: DictionaryItem) {
  if (!canUpdateItems.value || !canReadItem.value) return;
  const current = await getItem(row.id);
  itemKeys.clear();
  editingItem.value = current;
  Object.assign(itemForm, {
    code: current.code,
    name: current.name,
    parentID: current.parent_id || '',
    parentCode: current.parent_code || '',
    status: current.status,
    metadata: JSON.stringify(current.metadata_json || {}, null, 2),
    leaf: current.leaf,
    disabled: current.disabled,
    sortOrder: current.sort_order
  });
  itemVisible.value = true;
}
async function saveItem() {
  if (!canUpdateItems.value || !selected.value || itemSaving.value) return;
  let metadata: Record<string, unknown>;
  try {
    metadata = parseJSONObject(itemForm.metadata);
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '元数据错误');
    return;
  }
  const payload = {
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
  };
  const operation = JSON.stringify(['item', selected.value.id, payload]);
  itemSaving.value = true;
  try {
    await upsertItem(selected.value.id, payload, operationIdempotencyKey(itemKeys, operation));
    itemKeys.clear();
    itemVisible.value = false;
    await loadItems();
  } finally {
    itemSaving.value = false;
  }
}
async function removeItem(row: DictionaryItem) {
  if (!canDeleteItems.value || !canReadItem.value || mutatingItemID.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`确认删除条目“${row.name}”吗？`, '删除条目', { type: 'warning' })
  );
  if (!confirmed) return;
  const operation = `delete:${row.id}:${row.version}`;
  mutatingItemID.value = row.id;
  try {
    const current = await operationPromise(itemBaselines, operation, async () => {
      const detail = await getItem(row.id);
      if (
        hasPersistedVersionChanged(row.version, detail.version) ||
        hasPersistedStateChanged(row.status, detail.status)
      ) {
        throw new Error('字典条目已发生变化，请刷新后重试');
      }
      return detail;
    });
    await deleteItem(current, operationIdempotencyKey(itemKeys, operation));
    itemBaselines.delete(operation);
    itemKeys.delete(operation);
    if (selected.value) await loadItems();
  } finally {
    mutatingItemID.value = '';
  }
}
async function publish(row: DictionaryDefinition) {
  if (!canPublish.value || !canRead.value || publishingID.value) return;
  const comment = await promptUserInput(() => ElMessageBox.prompt('请输入发布说明', '发布字典', { inputValue: '' }));
  if (comment === undefined) return;
  const operation = JSON.stringify(['publish', row.id, row.version, comment]);
  publishingID.value = row.id;
  try {
    const current = await operationPromise(definitionBaselines, operation, async () => {
      const detail = await getDefinition(row);
      if (
        hasPersistedVersionChanged(row.version, detail.version) ||
        hasPersistedStateChanged(row.status, detail.status)
      ) {
        throw new Error('字典定义已发生变化，请刷新后重试');
      }
      return detail;
    });
    await publishDefinition(current, comment, operationIdempotencyKey(definitionActionKeys, operation));
    definitionBaselines.delete(operation);
    definitionActionKeys.delete(operation);
    window.$message?.success('字典版本已发布');
    await loadData();
  } finally {
    publishingID.value = '';
  }
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
  definitionFormKeys.clear();
  definitionActionKeys.clear();
  itemKeys.clear();
  itemBaselines.clear();
  definitionBaselines.clear();
  rows.value = [];
  total.value = 0;
  formVisible.value = false;
  itemsVisible.value = false;
  itemVisible.value = false;
  previewVisible.value = false;
  selected.value = undefined;
  items.value = [];
  itemsTotal.value = 0;
  itemsPage.value = 1;
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
            <ElButton v-if="canUpdate && canRead" link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton v-if="canListItems && row.kind === 'static'" link type="primary" @click="openItems(row)">
              条目
            </ElButton>
            <ElButton
              v-if="canPublish && canRead && row.kind === 'static'"
              link
              type="primary"
              :loading="publishingID === row.id"
              :disabled="Boolean(publishingID)"
              @click="publish(row)"
            >
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
    <div class="mb-12px flex justify-between gap-8px">
      <div class="flex gap-8px">
        <ElInput
          v-model="itemsKeyword"
          class="w-260px"
          clearable
          placeholder="搜索条目编码或名称"
          @keyup.enter="searchItems"
          @clear="searchItems"
        />
        <ElButton @click="searchItems">查询</ElButton>
      </div>
      <ElButton v-if="canUpdateItems" type="primary" @click="openNewItem">新增条目</ElButton>
    </div>
    <ElTable v-loading="itemsLoading" :data="items" border>
      <ElTableColumn prop="code" label="编码" />
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="parent_code" label="父编码" />
      <ElTableColumn prop="status" label="状态" width="100" />
      <ElTableColumn prop="sort_order" label="排序" width="80" />
      <ElTableColumn label="操作" width="130">
        <template #default="{ row }">
          <ElButton v-if="canUpdateItems && canReadItem" link type="primary" @click="editItem(row)">编辑</ElButton>
          <ElButton
            v-if="canDeleteItems && canReadItem"
            link
            type="danger"
            :loading="mutatingItemID === row.id"
            :disabled="Boolean(mutatingItemID)"
            @click="removeItem(row)"
          >
            删除
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      v-model:current-page="itemsPage"
      v-model:page-size="itemsPageSize"
      class="mt-16px justify-end"
      :total="itemsTotal"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="loadItems"
      @size-change="resizeItems"
    />
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
      <ElButton v-if="canUpdateItems" type="primary" :loading="itemSaving" @click="saveItem">保存</ElButton>
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
