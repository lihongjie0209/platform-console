<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { operationIdempotencyKey, operationPromise } from '@/platform/idempotency-key';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import { remoteSearchPage } from '@/platform/remote-search';
import { confirmUserAction } from '@/platform/user-action';
import type { WebhookDelivery, WebhookSubscription } from '../../api';
import { getDelivery, listDeliveries, listDeliverySubscriptions, replayDelivery } from '../../api';
defineOptions({ name: 'WebhookCenterDeliveries' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<WebhookDelivery[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const subscriptionID = ref('');
const subscriptionOptions = ref<WebhookSubscription[]>([]);
const subscriptionLoading = ref(false);
const detail = ref<WebhookDelivery>();
const replayingID = ref('');
const replayKeys = new Map<string, string>();
const replayBaselines = new Map<string, Promise<WebhookDelivery>>();
const loadGuard = createLatestRequestGuard();
const subscriptionGuard = createLatestRequestGuard();
const canReplay = computed(() => store.hasPermission({ scope: 'tenant', codes: 'webhook.delivery.replay' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'webhook.delivery.read' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    detail.value = undefined;
    return;
  }
  const v = await listDeliveries({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    subscriptionID: subscriptionID.value,
    status: status.value,
    page: page.value,
    pageSize: pageSize.value
  });
  if (loadGuard.isCurrent(request)) {
    rows.value = v.items || [];
    total.value = v.page.total || 0;
  }
}
async function searchSubscriptions(keyword = '') {
  const request = subscriptionGuard.begin();
  if (!scopeReady.value) {
    subscriptionOptions.value = [];
    subscriptionLoading.value = false;
    return;
  }
  subscriptionLoading.value = true;
  try {
    const result = await listDeliverySubscriptions({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      search: keyword.trim(),
      ...remoteSearchPage(50)
    });
    if (!subscriptionGuard.isCurrent(request)) return;
    const selected = subscriptionOptions.value.find(item => item.id === subscriptionID.value);
    subscriptionOptions.value = selected
      ? Array.from(new Map([selected, ...(result.items || [])].map(item => [item.id, item])).values())
      : result.items || [];
  } finally {
    if (subscriptionGuard.isCurrent(request)) subscriptionLoading.value = false;
  }
}
function applyFilters() {
  page.value = 1;
  load();
}
async function replay(v: WebhookDelivery) {
  if (!canReplay.value || !canRead.value || replayingID.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm('重放可能使外部系统再次处理同一事件，确认继续吗？', '重放 Webhook', { type: 'warning' })
  );
  if (!confirmed) return;
  const operation = `replay:${v.id}:${v.version}`;
  replayingID.value = v.id;
  try {
    const current = await operationPromise(replayBaselines, operation, async () => {
      const value = await getDelivery(v);
      if (
        hasPersistedVersionChanged(v.version, value.version) ||
        hasPersistedStateChanged(v.status, value.status) ||
        !['succeeded', 'dead'].includes(value.status)
      ) {
        throw new Error('投递状态已变化，请确认最新状态后重试');
      }
      return value;
    });
    await replayDelivery(current, operationIdempotencyKey(replayKeys, operation));
    replayBaselines.delete(operation);
    replayKeys.delete(operation);
    await load();
  } finally {
    replayingID.value = '';
  }
}
async function showDetail(v: WebhookDelivery) {
  if (!canRead.value) return;
  detail.value = await getDelivery(v);
}
watch([tenantID, applicationID], () => {
  subscriptionGuard.invalidate();
  replayKeys.clear();
  replayBaselines.clear();
  rows.value = [];
  total.value = 0;
  page.value = 1;
  detail.value = undefined;
  subscriptionID.value = '';
  subscriptionOptions.value = [];
  searchSubscriptions();
  load();
});
onMounted(() => {
  searchSubscriptions();
  load();
});
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
        <ElFormItem label="订阅">
          <ElSelect
            v-model="subscriptionID"
            filterable
            remote
            clearable
            reserve-keyword
            class="w-280px"
            placeholder="全部订阅"
            :remote-method="searchSubscriptions"
            :loading="subscriptionLoading"
          >
            <ElOption
              v-for="subscription in subscriptionOptions"
              :key="subscription.id"
              :label="subscription.name"
              :value="subscription.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-160px" placeholder="全部状态">
            <ElOption label="待处理" value="pending" />
            <ElOption label="处理中" value="processing" />
            <ElOption label="已成功" value="succeeded" />
            <ElOption label="重试中" value="retrying" />
            <ElOption label="死信" value="dead" />
          </ElSelect>
        </ElFormItem>
        <ElButton @click="applyFilters">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="event_subject" label="事件" min-width="220" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="attempt_count" label="尝试次数" />
        <ElTableColumn prop="response_status" label="HTTP" />
        <ElTableColumn prop="error_message" label="错误" min-width="180" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton v-if="canRead" link @click="showDetail(row)">详情</ElButton>
            <ElButton
              v-if="canReplay && canRead && ['succeeded', 'dead'].includes(row.status)"
              link
              :loading="replayingID === row.id"
              :disabled="Boolean(replayingID)"
              @click="replay(row)"
            >
              重放
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
          @size-change="applyFilters"
        />
      </div>
    </template>
  </ElCard>
  <ElDrawer :model-value="Boolean(detail)" title="投递详情" size="600px" @closed="detail = undefined">
    <pre class="whitespace-pre-wrap break-all">{{ JSON.stringify(detail, null, 2) }}</pre>
  </ElDrawer>
</template>
