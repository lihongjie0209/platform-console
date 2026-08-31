<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { WebhookDelivery } from '../../api';
import { listDeliveries, replayDelivery } from '../../api';
defineOptions({ name: 'WebhookCenterDeliveries' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const rows = ref<WebhookDelivery[]>([]);
const status = ref('');
const subscriptionID = ref('');
const detail = ref<WebhookDelivery>();
async function load() {
  if (!tenantID.value) return;
  const v = await listDeliveries({
    tenantID: tenantID.value,
    subscriptionID: subscriptionID.value,
    status: status.value
  });
  rows.value = v.items || [];
}
async function replay(v: WebhookDelivery) {
  await replayDelivery(v);
  await load();
}
watch(tenantID, load);
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <h2 class="m-0">Webhook 投递</h2>
        <p class="mb-0 text-#999">查看每次尝试、响应与错误；终态投递可按版本号安全重放。</p>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先选择租户" type="warning" :closable="false" />
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
            <ElButton v-if="['succeeded', 'dead'].includes(row.status)" link @click="replay(row)">重放</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
  <ElDrawer :model-value="Boolean(detail)" title="投递详情" size="600px" @closed="detail = undefined">
    <pre class="whitespace-pre-wrap break-all">{{ JSON.stringify(detail, null, 2) }}</pre>
  </ElDrawer>
</template>
