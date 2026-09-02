<script
  setup
  lang="ts"
  generic="
    Row extends Record<string, any>,
    Query extends Record<string, any>,
    Form extends Record<string, any>,
    Key extends BizCrudKey
  "
>
import { computed, nextTick, reactive, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { jsonClone } from '@sa/utils';
import { usePlatformStore } from '@/store/modules/platform';
import { $t } from '@/locales';
import { BizBatchActionBar } from '../common';
import BizCrudForm from './biz-crud-form.vue';
import BizDataTable from './biz-data-table.vue';
import BizFormDialog from './biz-form-dialog.vue';
import BizFormDrawer from './biz-form-drawer.vue';
import BizSearchForm from './biz-search-form.vue';
import BizTableToolbar from './biz-table-toolbar.vue';
import type { BizCrudAdapter, BizCrudColumn, BizCrudConfig, BizCrudFormExpose, BizCrudKey } from './types';
import { resolveBizText } from './types';

defineOptions({ name: 'BizCrudPage' });

interface Props {
  config: BizCrudConfig<Row, Query, Form, Key>;
  adapter: BizCrudAdapter<Row, Query, Form, Key>;
}

const props = defineProps<Props>();
const router = useRouter();
const platformStore = usePlatformStore();

const query = reactive<Query>(jsonClone(props.config.createQuery()));
const mutableQuery = query as Record<string, any>;
const rows = shallowRef<Row[]>([]);
const total = ref(0);
const loading = ref(false);
const submitting = ref(false);
const selectedRows = shallowRef<Row[]>([]);
const formVisible = ref(false);
const operateType = ref<'add' | 'edit'>('add');
const editingKey = shallowRef<Key | null>(null);
const formModel = shallowRef<Form>(props.config.form.createModel());
const formRef = ref<BizCrudFormExpose | null>(null);
const dataTableRef = ref<{ clearSelection: () => void } | null>(null);

const pageKey = computed(() => props.config.pagination?.pageKey || ('current' as Extract<keyof Query, string>));
const pageSizeKey = computed(() => props.config.pagination?.pageSizeKey || ('size' as Extract<keyof Query, string>));
const currentPage = computed(() => Number(query[pageKey.value] || 1));
const pageSize = computed(() => Number(query[pageSizeKey.value] || 10));

const sourceColumns = computed(() => props.config.columns());
const columnChecks = ref<UI.TableColumnCheck[]>(createColumnChecks(sourceColumns.value));
const columns = computed(() => filterColumns(sourceColumns.value, columnChecks.value));
const title = computed(() => resolveBizText(props.config.title));
const formTitle = computed(() =>
  resolveBizText(operateType.value === 'add' ? props.config.form.createTitle : props.config.form.editTitle)
);
const selectedKeys = computed(() => selectedRows.value.map(row => row[props.config.rowKey] as Key));
const canCreate = computed(
  () => Boolean(props.adapter.create) && platformStore.hasPermission(props.config.permissions?.create)
);
const canUpdate = computed(
  () => Boolean(props.adapter.update) && platformStore.hasPermission(props.config.permissions?.update)
);
const canRemove = computed(
  () => Boolean(props.adapter.remove) && platformStore.hasPermission(props.config.permissions?.remove)
);

function getColumnKey(column: BizCrudColumn<Row>) {
  if (column.type === 'selection') return '__selection__';
  if (column.type === 'index') return '__index__';
  if (column.type === 'expand') return '__expand__';
  return String(column.prop);
}

function createColumnChecks(items: BizCrudColumn<Row>[]) {
  return items.map(column => ({
    prop: getColumnKey(column),
    label: String(column.label || getColumnKey(column)),
    checked: true,
    visible: !['selection', 'index', 'expand'].includes(String(column.type))
  }));
}

function filterColumns(items: BizCrudColumn<Row>[], checks: UI.TableColumnCheck[]) {
  const columnMap = new Map(items.map(column => [getColumnKey(column), column]));
  return checks
    .filter(check => check.checked)
    .map(check => columnMap.get(check.prop))
    .filter(Boolean) as BizCrudColumn<Row>[];
}

async function loadData() {
  loading.value = true;
  try {
    const result = await props.adapter.list(query as unknown as Query);
    rows.value = result.items;
    total.value = result.total;
    mutableQuery[pageKey.value] = result.page;
    mutableQuery[pageSizeKey.value] = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  const nextQuery = props.config.createQuery();
  Object.assign(query, jsonClone(nextQuery));
  loadData();
}

function search() {
  mutableQuery[pageKey.value] = 1;
  loadData();
}

function changePage(page: number) {
  mutableQuery[pageKey.value] = page;
  loadData();
}

function changePageSize(size: number) {
  mutableQuery[pageKey.value] = 1;
  mutableQuery[pageSizeKey.value] = size;
  loadData();
}

async function openCreate() {
  if (!canCreate.value) return;
  if (props.config.form.mode === 'page') {
    const route = props.config.form.toCreateRoute?.();
    if (route) await router.push(route);
    return;
  }

  operateType.value = 'add';
  editingKey.value = null;
  formModel.value = props.config.form.createModel();
  formVisible.value = true;
  await nextTick();
  formRef.value?.resetValidation();
}

async function openEdit(row: Row) {
  if (!canUpdate.value) return;
  const key = row[props.config.rowKey] as Key;
  if (props.config.form.mode === 'page') {
    const route = props.config.form.toEditRoute?.(key, row);
    if (route) await router.push(route);
    return;
  }

  operateType.value = 'edit';
  editingKey.value = key;
  const base = props.config.mapRowToForm?.(row) || row;
  formModel.value = Object.assign(props.config.form.createModel(), jsonClone(base));
  formVisible.value = true;

  if (props.adapter.detail) {
    loading.value = true;
    try {
      Object.assign(formModel.value, await props.adapter.detail(key));
    } finally {
      loading.value = false;
    }
  }

  await nextTick();
  formRef.value?.resetValidation();
}

async function submitForm() {
  if (submitting.value || !(await formRef.value?.validate())) return;
  if ((operateType.value === 'add' && !canCreate.value) || (operateType.value === 'edit' && !canUpdate.value)) return;

  submitting.value = true;
  try {
    if (operateType.value === 'add') {
      await props.adapter.create?.(jsonClone(formModel.value));
    } else if (editingKey.value !== null) {
      await props.adapter.update?.(editingKey.value, jsonClone(formModel.value));
    }
    window.$message?.success(operateType.value === 'add' ? $t('common.addSuccess') : $t('common.updateSuccess'));
    formVisible.value = false;
    await loadData();
  } finally {
    submitting.value = false;
  }
}

async function removeRows(keys: Key[]) {
  if (!keys.length || !props.adapter.remove || !canRemove.value) return;

  await props.adapter.remove(keys);
  selectedRows.value = [];
  window.$message?.success($t('common.deleteSuccess'));
  await loadData();
}

function clearForm() {
  editingKey.value = null;
  formModel.value = props.config.form.createModel();
}

function clearSelection() {
  dataTableRef.value?.clearSelection();
  selectedRows.value = [];
}

// initial request
loadData();
</script>

<template>
  <div class="biz-crud-page min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <BizSearchForm
      v-if="config.searchFields?.length"
      v-model="query"
      :fields="config.searchFields"
      :loading="loading"
      @reset="resetQuery"
      @search="search"
    >
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}" />
      </template>
    </BizSearchForm>

    <ElCard class="card-wrapper sm:flex-1-hidden">
      <template #header>
        <div class="flex items-center justify-between gap-16px">
          <p>{{ title }}</p>
          <BizTableToolbar
            v-model:columns="columnChecks"
            :loading="loading"
            :can-create="canCreate"
            :can-delete="canRemove && selectedKeys.length > 0"
            :show-column-setting="config.showColumnSetting !== false"
            @create="openCreate"
            @delete="removeRows(selectedKeys)"
            @refresh="loadData"
          >
            <template #prefix><slot name="toolbar-prefix" /></template>
            <template #suffix><slot name="toolbar-suffix" /></template>
          </BizTableToolbar>
        </div>
      </template>

      <BizBatchActionBar
        v-if="selectedKeys.length"
        :count="selectedKeys.length"
        class="mb-12px"
        @clear="clearSelection"
      >
        <slot name="batch-actions" :rows="selectedRows" :keys="selectedKeys" :remove="removeRows" />
      </BizBatchActionBar>

      <BizDataTable
        ref="dataTableRef"
        :data="rows"
        :columns="columns"
        :loading="loading"
        :row-key="config.rowKey"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="config.pagination?.pageSizes"
        @selection-change="selectedRows = $event"
        @page-change="changePage"
        @page-size-change="changePageSize"
      >
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot
            :name="name"
            v-bind="slotProps || {}"
            :edit="openEdit"
            :remove="(row: Row) => removeRows([row[config.rowKey] as Key])"
            :can-edit="canUpdate"
            :can-delete="canRemove"
          />
        </template>
      </BizDataTable>
    </ElCard>

    <BizFormDialog
      v-if="config.form.mode === 'dialog'"
      v-model="formVisible"
      :title="formTitle"
      :width="config.form.width"
      :submitting="submitting"
      @submit="submitForm"
      @cancel="clearForm"
    >
      <BizCrudForm ref="formRef" v-model="formModel" :fields="config.form.fields">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps || {}" :operate-type="operateType" />
        </template>
      </BizCrudForm>
      <slot name="form-extra" :model="formModel" :operate-type="operateType" :editing-key="editingKey" />
    </BizFormDialog>

    <BizFormDrawer
      v-if="config.form.mode === 'drawer'"
      v-model="formVisible"
      :title="formTitle"
      :width="config.form.width"
      :submitting="submitting"
      @submit="submitForm"
      @cancel="clearForm"
    >
      <BizCrudForm ref="formRef" v-model="formModel" :fields="config.form.fields">
        <template v-for="(_, name) in $slots" #[name]="slotProps">
          <slot :name="name" v-bind="slotProps || {}" :operate-type="operateType" />
        </template>
      </BizCrudForm>
      <slot name="form-extra" :model="formModel" :operate-type="operateType" :editing-key="editingKey" />
    </BizFormDrawer>
  </div>
</template>
