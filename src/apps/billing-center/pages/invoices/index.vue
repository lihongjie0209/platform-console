<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { promptUserInput } from '@/platform/user-action';
import type { Invoice } from '../../api';
import { finalizeInvoice, listInvoices, voidInvoice } from '../../api';
defineOptions({ name: 'BillingCenterInvoices' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<Invoice[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const loadGuard = createLatestRequestGuard();
const canFinalize = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.invoice.finalize' }));
const canVoid = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.invoice.void' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  const v = await listInvoices({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    page: page.value,
    pageSize: pageSize.value
  });
  if (loadGuard.isCurrent(request)) {
    rows.value = v.items || [];
    total.value = v.total || 0;
  }
}
function search() {
  page.value = 1;
  load();
}
async function finalize(v: Invoice) {
  if (!canFinalize.value) return;
  await finalizeInvoice(v, new Date(Date.now() + 7 * 86400000).toISOString());
  await load();
}
async function voidOne(v: Invoice) {
  if (!canVoid.value) return;
  const reason = await promptUserInput(() =>
    ElMessageBox.prompt('请输入作废原因', '作废账单', {
      inputPattern: /\S+/,
      inputErrorMessage: '作废原因不能为空',
      type: 'warning'
    })
  );
  if (!reason) return;
  await voidInvoice(v, reason);
  await load();
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  page.value = 1;
  load();
});
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
        <ElButton @click="search">查询</ElButton>
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
            <ElButton v-if="canFinalize && row.status === 'draft'" link @click="finalize(row)">确认</ElButton>
            <ElButton v-if="canVoid && row.status !== 'void'" link type="danger" @click="voidOne(row)">作废</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-16px flex justify-end">
        <ElPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="load"
          @size-change="search"
        />
      </div>
    </template>
  </ElCard>
</template>
