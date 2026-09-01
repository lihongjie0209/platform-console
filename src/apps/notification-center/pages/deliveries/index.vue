<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import type { NotificationDelivery } from '../../api';
import { listDeliveries, sendNotification } from '../../api';
import { parseNotificationVariables } from '../../variables';

defineOptions({ name: 'NotificationCenterDeliveries' });
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const loading = ref(false);
const sending = ref(false);
const rows = ref<NotificationDelivery[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const visible = ref(false);
const detail = ref<NotificationDelivery>();
const detailVisible = ref(false);
const form = reactive({
  templateCode: '',
  channel: 'email',
  locale: 'zh-cn',
  recipient: '',
  variables: '{}',
  idempotencyKey: ''
});

async function loadData() {
  if (!scopeReady.value) return;
  loading.value = true;
  try {
    const result = await listDeliveries({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      status: status.value,
      page: page.value,
      pageSize: pageSize.value
    });
    rows.value = result.deliveries || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}
function search() {
  page.value = 1;
  loadData();
}
function openSend() {
  Object.assign(form, {
    templateCode: '',
    channel: 'email',
    locale: 'zh-cn',
    recipient: '',
    variables: '{}',
    idempotencyKey: crypto.randomUUID()
  });
  visible.value = true;
}
async function send() {
  if (!scopeReady.value) return;
  let variables: Record<string, string>;
  try {
    variables = parseNotificationVariables(form.variables);
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '变量格式错误');
    return;
  }
  sending.value = true;
  try {
    await sendNotification({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      ...form,
      variables
    });
    visible.value = false;
    window.$message?.success('通知已进入发送队列');
    await loadData();
  } finally {
    sending.value = false;
  }
}
function showDetail(row: NotificationDelivery) {
  detail.value = row;
  detailVisible.value = true;
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  visible.value = false;
  detail.value = undefined;
  detailVisible.value = false;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">发送记录</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            查询 {{ applicationName }} 的异步投递状态、供应商回执和失败原因。
          </p>
        </div>
        <ElButton type="primary" :disabled="!scopeReady" @click="openSend">发送测试通知</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline class="mb-16px">
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-160px">
            <ElOption
              v-for="item in [
                'pending',
                'processing',
                'retrying',
                'sent',
                'delivered',
                'bounced',
                'failed',
                'dead_letter'
              ]"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" />
        <ElTableColumn prop="template_code" label="模板" min-width="160" />
        <ElTableColumn prop="channel" label="渠道" width="100" />
        <ElTableColumn prop="recipient" label="接收方" min-width="200" />
        <ElTableColumn prop="status" label="状态" width="120" />
        <ElTableColumn prop="attempts" label="尝试" width="75" />
        <ElTableColumn prop="provider" label="供应商" width="120" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }"><ElButton link type="primary" @click="showDetail(row)">详情</ElButton></template>
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
    </template>
  </ElCard>
  <ElDialog v-model="visible" title="发送测试通知" width="660px">
    <ElForm label-width="100px">
      <ElFormItem label="模板编码" required><ElInput v-model="form.templateCode" /></ElFormItem>
      <ElFormItem label="渠道" required>
        <ElSelect v-model="form.channel">
          <ElOption v-for="item in ['email', 'sms', 'webhook', 'in_app']" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="语言"><ElInput v-model="form.locale" /></ElFormItem>
      <ElFormItem label="接收方" required><ElInput v-model="form.recipient" /></ElFormItem>
      <ElFormItem label="变量"><ElInput v-model="form.variables" type="textarea" :rows="6" /></ElFormItem>
      <ElFormItem label="幂等键"><ElInput v-model="form.idempotencyKey" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" :loading="sending" @click="send">发送</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="detailVisible" title="投递详情" size="620px">
    <ElDescriptions v-if="detail" :column="1" border>
      <ElDescriptionsItem label="ID">{{ detail.id }}</ElDescriptionsItem>
      <ElDescriptionsItem label="状态">{{ detail.status }}</ElDescriptionsItem>
      <ElDescriptionsItem label="供应商消息 ID">{{ detail.provider_message_id || '-' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="失败原因">{{ detail.failure_reason || '-' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="变量">
        <pre>{{ JSON.stringify(detail.variables, null, 2) }}</pre>
      </ElDescriptionsItem>
      <ElDescriptionsItem label="幂等键">{{ detail.idempotency_key }}</ElDescriptionsItem>
    </ElDescriptions>
  </ElDrawer>
</template>
