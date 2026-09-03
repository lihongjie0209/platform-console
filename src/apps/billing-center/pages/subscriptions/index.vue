<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { confirmUserAction } from '@/platform/user-action';
import type { Subscription } from '../../api';
import { cancelSubscription, createSubscription, getSubscription, listSubscriptions } from '../../api';
defineOptions({ name: 'BillingCenterSubscriptions' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<Subscription[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const visible = ref(false);
const form = reactive({ planID: '', startsAt: '', externalReference: '' });
const loadGuard = createLatestRequestGuard();
const canCreate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.create' }));
const canCancel = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.cancel' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.read' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  const v = await listSubscriptions({
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
async function create() {
  if (!canCreate.value || !scopeReady.value) return;
  await createSubscription({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    planID: form.planID,
    startsAt: form.startsAt,
    externalReference: form.externalReference
  });
  visible.value = false;
  await load();
}
async function cancel(v: Subscription) {
  if (!canCancel.value || !canRead.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm('取消将在当前计费周期结束后生效，确认继续吗？', '取消订阅', { type: 'warning' })
  );
  if (!confirmed) return;
  const current = await getSubscription(v);
  await cancelSubscription(current, true);
  await load();
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  page.value = 1;
  visible.value = false;
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">应用订阅</h2>
          <p class="mb-0 text-#999">{{ applicationName }} · 套餐订阅、变更与周期末取消均由计费服务维护。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="visible = true">创建订阅</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="search">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="id" label="订阅 ID" />
        <ElTableColumn prop="plan_id" label="套餐 ID" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="current_period_start" label="周期开始" />
        <ElTableColumn prop="current_period_end" label="周期结束" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton v-if="canCancel && canRead && row.status === 'active'" link type="danger" @click="cancel(row)">
              周期末取消
            </ElButton>
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
  <ElDialog v-model="visible" title="创建订阅">
    <ElForm label-width="100px">
      <ElFormItem label="套餐 ID"><ElInput v-model="form.planID" /></ElFormItem>
      <ElFormItem label="开始时间">
        <ElDatePicker v-model="form.startsAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" />
      </ElFormItem>
      <ElFormItem label="外部引用"><ElInput v-model="form.externalReference" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="canCreate" type="primary" @click="create">创建</ElButton>
    </template>
  </ElDialog>
</template>
