<script setup lang="ts" generic="Row extends Record<string, any>">
import { ref } from 'vue';
import type { TableInstance } from 'element-plus';
import type { BizCrudColumn } from './types';

defineOptions({ name: 'BizDataTable' });

interface Props {
  data: Row[];
  columns: BizCrudColumn<Row>[];
  loading?: boolean;
  rowKey: string;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  pageSizes?: number[];
  defaultExpandAll?: boolean;
  treeProps?: { children: string; hasChildren: string };
}

withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  currentPage: 1,
  pageSize: 10,
  pageSizes: () => [10, 15, 20, 25, 30],
  treeProps: undefined
});

const emit = defineEmits<{
  selectionChange: [rows: Row[]];
  pageChange: [page: number];
  pageSizeChange: [size: number];
}>();

const tableRef = ref<TableInstance>();

defineExpose({ clearSelection: () => tableRef.value?.clearSelection() });

function getColumnProps(column: BizCrudColumn<Row>) {
  const { slot: _slot, ...props } = column;
  return props as Record<string, any>;
}
</script>

<template>
  <div class="biz-data-table">
    <div class="min-h-280px flex-1 overflow-hidden">
      <ElTable
        ref="tableRef"
        v-loading="loading"
        height="100%"
        border
        :data="data"
        :row-key="rowKey"
        :default-expand-all="defaultExpandAll"
        :tree-props="treeProps"
        @selection-change="emit('selectionChange', $event)"
      >
        <ElTableColumn
          v-for="column in columns"
          :key="String(column.prop || column.type)"
          v-bind="getColumnProps(column)"
        >
          <template v-if="column.slot" #default="scope">
            <slot :name="`cell-${column.slot}`" v-bind="scope" />
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
    <div v-if="total" class="mt-20px flex justify-end">
      <ElPagination
        layout="total,prev,pager,next,sizes"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        @current-change="emit('pageChange', $event)"
        @size-change="emit('pageSizeChange', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.biz-data-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
