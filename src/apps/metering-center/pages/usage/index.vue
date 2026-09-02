<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { parseJSONObject } from '@/platform/json';
import type { UsagePoint } from '../../api';
import { queryUsage } from '../../api';
defineOptions({ name: 'MeteringCenterUsage' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const meterCode = ref('');
const range = ref<[string, string]>();
const granularity = ref('day');
const dimensions = ref('{}');
const rows = ref<UsagePoint[]>([]);
const totalQuantity = ref(0);
const loading = ref(false);
const searchGuard = createLatestRequestGuard();
async function search() {
  if (!scopeReady.value || !range.value || !meterCode.value.trim()) return;
  const request = searchGuard.begin();
  loading.value = true;
  try {
    const v = await queryUsage({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      meterCode: meterCode.value,
      startAt: range.value[0],
      endAt: range.value[1],
      dimensions: parseJSONObject(dimensions.value, '维度') as Record<string, string>,
      granularity: granularity.value,
      page: 1,
      pageSize: 100
    });
    if (searchGuard.isCurrent(request)) {
      rows.value = v.items || [];
      totalQuantity.value = v.total_quantity || 0;
    }
  } catch (e) {
    if (searchGuard.isCurrent(request)) window.$message?.error(e instanceof Error ? e.message : '查询失败');
  } finally {
    if (searchGuard.isCurrent(request)) loading.value = false;
  }
}
watch([tenantID, applicationID], () => {
  searchGuard.invalidate();
  rows.value = [];
  totalQuantity.value = 0;
  loading.value = false;
});
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <h2 class="m-0">用量查询</h2>
        <p class="mb-0 text-#999">{{ applicationName }} · 按计量项、时间粒度和维度聚合查询。</p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <ElForm v-else inline>
      <ElFormItem label="计量编码"><ElInput v-model="meterCode" /></ElFormItem>
      <ElFormItem label="时间">
        <ElDatePicker v-model="range" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ssZ" />
      </ElFormItem>
      <ElFormItem label="粒度">
        <ElSelect v-model="granularity" class="w-120px">
          <ElOption v-for="v in ['hour', 'day', 'month']" :key="v" :label="v" :value="v" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="维度 JSON"><ElInput v-model="dimensions" /></ElFormItem>
      <ElButton type="primary" :disabled="!range || !meterCode.trim()" @click="search">查询</ElButton>
    </ElForm>
    <ElStatistic title="总用量" :value="totalQuantity" class="mb-16px" />
    <ElTable v-loading="loading" :data="rows" border>
      <ElTableColumn prop="window_start" label="开始时间" />
      <ElTableColumn prop="window_end" label="结束时间" />
      <ElTableColumn prop="quantity" label="用量" />
      <ElTableColumn label="维度">
        <template #default="{ row }">{{ JSON.stringify(row.dimensions || {}) }}</template>
      </ElTableColumn>
    </ElTable>
  </ElCard>
</template>
