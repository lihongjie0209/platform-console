<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { ResourcePage } from '../api';

defineOptions({ name: 'PlatformAdminResourceList' });

export interface ResourceColumn {
  key: string;
  label: string;
  minWidth?: number;
  width?: number;
  kind?: 'text' | 'status' | 'time';
}

const props = defineProps<{
  title: string;
  description: string;
  columns: ResourceColumn[];
  tenantScoped?: boolean;
  load: (tenantID: string, page: number, pageSize: number) => Promise<ResourcePage<Record<string, unknown>>>;
}>();

const platformStore = usePlatformStore();
const loading = ref(false);
const rows = ref<Record<string, unknown>[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const tenantID = computed(() => platformStore.selectedTenantId);
const tenantMissing = computed(() => props.tenantScoped && !tenantID.value);

function display(value: unknown) {
  return value === undefined || value === null || value === '' ? '-' : String(value);
}

function statusType(value: unknown) {
  if (value === 'active' || value === 'published') return 'success';
  if (value === 'disabled') return 'danger';
  return 'info';
}

async function loadData() {
  if (tenantMissing.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await props.load(tenantID.value, page.value, pageSize.value);
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function changePage(value: number) {
  page.value = value;
  loadData();
}

function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  loadData();
}

watch(tenantID, () => {
  page.value = 1;
  loadData();
});
onMounted(loadData);
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <ElCard class="card-wrapper" shadow="never">
      <template #header>
        <div class="flex-y-center justify-between gap-12px">
          <div>
            <h2 class="m-0 text-18px font-semibold">{{ title }}</h2>
            <p class="mb-0 mt-6px text-13px text-#999">{{ description }}</p>
          </div>
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
        </div>
      </template>

      <ElAlert v-if="tenantMissing" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
      <template v-else>
        <ElTable v-loading="loading" :data="rows" border stripe>
          <ElTableColumn
            v-for="column in columns"
            :key="column.key"
            :prop="column.key"
            :label="column.label"
            :min-width="column.minWidth"
            :width="column.width"
          >
            <template #default="scope">
              <ElTag v-if="column.kind === 'status'" :type="statusType(scope.row[column.key])" effect="plain">
                {{ display(scope.row[column.key]) }}
              </ElTag>
              <span v-else>{{ display(scope.row[column.key]) }}</span>
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
            @update:current-page="changePage"
            @update:page-size="changePageSize"
          />
        </div>
      </template>
    </ElCard>
  </div>
</template>
