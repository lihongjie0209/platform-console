<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { Subscription } from '../../api';
import { cancelSubscription, createSubscription, listSubscriptions } from '../../api';
defineOptions({ name: 'BillingCenterSubscriptions' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const rows = ref<Subscription[]>([]);
const status = ref('');
const visible = ref(false);
const form = reactive({ planID: '', startsAt: '', externalReference: '' });
async function load() {
  if (!tenantID.value) return;
  const v = await listSubscriptions({ tenantID: tenantID.value, status: status.value, page: 1, pageSize: 100 });
  rows.value = v.items || [];
}
async function create() {
  if (!tenantID.value) return;
  await createSubscription({
    tenantID: tenantID.value,
    planID: form.planID,
    startsAt: form.startsAt,
    externalReference: form.externalReference
  });
  visible.value = false;
  await load();
}
async function cancel(v: Subscription) {
  await cancelSubscription(v, true);
  await load();
}
watch(tenantID, load);
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">租户订阅</h2>
          <p class="mb-0 text-#999">订阅、变更与周期末取消均由计费服务维护。</p>
        </div>
        <ElButton type="primary" :disabled="!tenantID" @click="visible = true">创建订阅</ElButton>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先选择租户" type="warning" :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="id" label="订阅 ID" />
        <ElTableColumn prop="plan_id" label="套餐 ID" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="current_period_start" label="周期开始" />
        <ElTableColumn prop="current_period_end" label="周期结束" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton v-if="row.status === 'active'" link type="danger" @click="cancel(row)">周期末取消</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
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
      <ElButton type="primary" @click="create">创建</ElButton>
    </template>
  </ElDialog>
</template>
