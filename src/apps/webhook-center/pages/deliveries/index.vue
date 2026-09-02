<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import type { WebhookDelivery } from '../../api';
import { listDeliveries, replayDelivery } from '../../api';
defineOptions({ name: 'WebhookCenterDeliveries' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<WebhookDelivery[]>([]);
const status = ref('');
const subscriptionID = ref('');
const detail = ref<WebhookDelivery>();
const loadGuard = createLatestRequestGuard();
const canReplay = computed(() => store.hasPermission({ scope: 'tenant', codes: 'webhook.delivery.replay' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    detail.value = undefined;
    return;
  }
  const v = await listDeliveries({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    subscriptionID: subscriptionID.value,
    status: status.value
  });
  if (loadGuard.isCurrent(request)) rows.value = v.items || [];
}
async function replay(v: WebhookDelivery) {
  if (!canReplay.value) return;
  await replayDelivery(v);
  await load();
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  detail.value = undefined;
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <h2 class="m-0">Webhook 投递</h2>
        <p class="mb-0 text-#999">{{ applicationName }} · 查看每次尝试、响应与错误；终态投递可按版本号安全重放。</p>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="订阅 ID"><ElInput v-model="subscriptionID" /></ElFormItem>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="event_subject" label="事件" min-width="220" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="attempt_count" label="尝试次数" />
        <ElTableColumn prop="response_status" label="HTTP" />
        <ElTableColumn prop="error_message" label="错误" min-width="180" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton link @click="detail = row">详情</ElButton>
            <ElButton v-if="canReplay && ['succeeded', 'dead'].includes(row.status)" link @click="replay(row)">
              重放
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
  <ElDrawer :model-value="Boolean(detail)" title="投递详情" size="600px" @closed="detail = undefined">
    <pre class="whitespace-pre-wrap break-all">{{ JSON.stringify(detail, null, 2) }}</pre>
  </ElDrawer>
</template>
