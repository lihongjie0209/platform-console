<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import type { Invoice } from '../../api';
import { finalizeInvoice, listInvoices, voidInvoice } from '../../api';
defineOptions({ name: 'BillingCenterInvoices' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<Invoice[]>([]);
const status = ref('');
async function load() {
  if (!scopeReady.value) {
    rows.value = [];
    return;
  }
  const v = await listInvoices({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    page: 1,
    pageSize: 100
  });
  rows.value = v.items || [];
}
async function finalize(v: Invoice) {
  await finalizeInvoice(v, new Date(Date.now() + 7 * 86400000).toISOString());
  await load();
}
async function voidOne(v: Invoice) {
  await voidInvoice(v, 'operator void');
  await load();
}
watch([tenantID, applicationID], load);
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <h2 class="m-0">账单</h2>
        <p class="mb-0 text-#999">{{ applicationName }} · 查看账单金额和收款状态，并执行带乐观锁的确认与作废。</p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="number" label="账单号" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="currency" label="币种" />
        <ElTableColumn prop="total_minor" label="总额(分)" />
        <ElTableColumn prop="paid_minor" label="已付(分)" />
        <ElTableColumn prop="refunded_minor" label="退款(分)" />
        <ElTableColumn label="操作" width="150">
          <template #default="{ row }">
            <ElButton v-if="row.status === 'draft'" link @click="finalize(row)">确认</ElButton>
            <ElButton v-if="row.status !== 'void'" link type="danger" @click="voidOne(row)">作废</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
</template>
