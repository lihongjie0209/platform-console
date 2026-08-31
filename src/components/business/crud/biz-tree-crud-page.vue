<script setup lang="ts" generic="Row extends Record<string, any>">
import { computed } from 'vue';
import BizDataTable from './biz-data-table.vue';
import BizTableToolbar from './biz-table-toolbar.vue';

defineOptions({ name: 'BizTreeCrudPage' });

interface Props {
  title: string;
  data: Row[];
  columns: Record<string, any>[];
  loading?: boolean;
  rowKey: string;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  pageSizes?: number[];
  canDelete?: boolean;
  showColumnSetting?: boolean;
  defaultExpandAll?: boolean;
  treeProps?: { children: string; hasChildren: string };
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  currentPage: 1,
  pageSize: 10,
  pageSizes: () => [10, 15, 20, 25, 30],
  canDelete: false,
  showColumnSetting: true,
  defaultExpandAll: false,
  treeProps: () => ({ children: 'children', hasChildren: 'hasChildren' })
});

const columnChecks = defineModel<UI.TableColumnCheck[]>('columnChecks', { required: true });
const emit = defineEmits<{
  add: [];
  delete: [];
  refresh: [];
  selectionChange: [rows: Row[]];
  pageChange: [page: number];
  pageSizeChange: [size: number];
}>();

function getColumnKey(column: Record<string, any>) {
  if (column.type === 'selection') return '__selection__';
  if (column.type === 'index') return '__index__';
  if (column.type === 'expand') return '__expand__';
  return String(column.prop);
}

const visibleColumns = computed(() => {
  const checks = new Map(columnChecks.value.map(item => [item.prop, item.checked]));
  return props.columns.filter(column => checks.get(getColumnKey(column)) !== false);
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ElCard class="card-wrapper sm:flex-1-hidden">
      <template #header>
        <div class="flex items-center justify-between gap-16px">
          <p>{{ title }}</p>
          <BizTableToolbar
            v-model:columns="columnChecks"
            :loading="loading"
            :can-delete="canDelete"
            :show-column-setting="showColumnSetting"
            @create="emit('add')"
            @delete="emit('delete')"
            @refresh="emit('refresh')"
          />
        </div>
      </template>
      <BizDataTable
        :data="data"
        :columns="visibleColumns"
        :loading="loading"
        :row-key="rowKey"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :default-expand-all="defaultExpandAll"
        :tree-props="treeProps"
        @selection-change="emit('selectionChange', $event)"
        @page-change="emit('pageChange', $event)"
        @page-size-change="emit('pageSizeChange', $event)"
      />
      <slot />
    </ElCard>
  </div>
</template>
