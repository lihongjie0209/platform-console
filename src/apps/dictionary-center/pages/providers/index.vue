<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { DictionaryProvider } from '../../api';
import { listProviders } from '../../api';

defineOptions({ name: 'DictionaryCenterProviders' });
const loading = ref(false);
const rows = ref<DictionaryProvider[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const selected = ref<DictionaryProvider>();
const visible = ref(false);
async function loadData() {
  loading.value = true;
  try {
    const result = await listProviders(status.value, page.value, pageSize.value);
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
function show(row: DictionaryProvider) {
  selected.value = row;
  visible.value = true;
}
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div>
        <h2 class="m-0 text-18px font-semibold">动态字典 Provider</h2>
        <p class="mb-0 mt-6px text-13px text-#999">
          观察由 Provider SDK 自动注册和续租的动态字典能力；租约令牌不会暴露给管理端。
        </p>
      </div>
    </template>
    <ElForm inline class="mb-16px">
      <ElFormItem label="状态">
        <ElSelect v-model="status" clearable class="w-150px">
          <ElOption v-for="value in ['active', 'inactive', 'expired']" :key="value" :label="value" :value="value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="search">查询</ElButton>
        <ElButton @click="loadData">刷新</ElButton>
      </ElFormItem>
    </ElForm>
    <ElTable v-loading="loading" :data="rows" border stripe>
      <ElTableColumn prop="service_name" label="服务" min-width="180" />
      <ElTableColumn prop="target" label="gRPC Target" min-width="220" />
      <ElTableColumn prop="status" label="状态" width="110" />
      <ElTableColumn
        prop="lease_expires_at"
        label="租约到期"
        min-width="190"
        :formatter="formatPlatformTableDateTime"
      />
      <ElTableColumn prop="cache_ttl_seconds" label="缓存 TTL(s)" width="120" />
      <ElTableColumn prop="timeout_milliseconds" label="超时(ms)" width="110" />
      <ElTableColumn label="操作" width="80">
        <template #default="{ row }"><ElButton link type="primary" @click="show(row)">能力</ElButton></template>
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
  </ElCard>
  <ElDrawer v-model="visible" title="Provider 能力" size="680px">
    <ElDescriptions v-if="selected" :column="1" border>
      <ElDescriptionsItem label="Provider ID">{{ selected.id }}</ElDescriptionsItem>
      <ElDescriptionsItem label="服务">{{ selected.service_name }}</ElDescriptionsItem>
      <ElDescriptionsItem label="Target">{{ selected.target }}</ElDescriptionsItem>
      <ElDescriptionsItem label="能力">
        <pre class="overflow-auto whitespace-pre-wrap">{{ JSON.stringify(selected.capabilities_json, null, 2) }}</pre>
      </ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>
