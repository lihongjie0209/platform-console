<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { parseJSONObject } from '@/apps/commerce/json';
import type { WebhookSubscription } from '../../api';
import { deleteSubscription, listSubscriptions, rotateSecret, saveSubscription, testSubscription } from '../../api';
defineOptions({ name: 'WebhookCenterSubscriptions' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<WebhookSubscription[]>([]);
const status = ref('');
const search = ref('');
const visible = ref(false);
const editing = ref<WebhookSubscription>();
const secret = ref('');
const testPayload = ref('{}');
const loadGuard = createLatestRequestGuard();
const form = reactive({
  name: '',
  endpointURL: '',
  subjectFilter: 'platform.>',
  status: 'active',
  timeoutMS: 5000,
  maxAttempts: 5,
  retryInitialSeconds: 5
});
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    return;
  }
  const v = await listSubscriptions({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
    search: search.value
  });
  if (loadGuard.isCurrent(request)) rows.value = v.items || [];
}
function open(v?: WebhookSubscription) {
  editing.value = v;
  Object.assign(
    form,
    v
      ? {
          name: v.name,
          endpointURL: v.endpoint_url,
          subjectFilter: v.subject_filter,
          status: v.status,
          timeoutMS: v.timeout_ms || 5000,
          maxAttempts: v.max_attempts || 5,
          retryInitialSeconds: v.retry_initial_seconds || 5
        }
      : {
          name: '',
          endpointURL: '',
          subjectFilter: 'platform.>',
          status: 'active',
          timeoutMS: 5000,
          maxAttempts: 5,
          retryInitialSeconds: 5
        }
  );
  visible.value = true;
}
async function save() {
  if (!scopeReady.value) return;
  const result = await saveSubscription(editing.value, tenantID.value, {
    ...form,
    applicationID: applicationID.value
  });
  if ('signing_secret' in result) {
    secret.value = result.signing_secret;
    window.$message?.warning('签名密钥仅显示一次，请立即保存');
  }
  visible.value = false;
  await load();
}
async function rotate(v: WebhookSubscription) {
  const result = await rotateSecret(v);
  secret.value = result.signing_secret;
  window.$message?.warning('新密钥仅显示一次，请立即保存');
  await load();
}
async function remove(v: WebhookSubscription) {
  await deleteSubscription(v);
  await load();
}
async function test(v: WebhookSubscription) {
  try {
    await testSubscription(v, parseJSONObject(testPayload.value, '测试负载'));
    window.$message?.success('测试投递已入队');
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : '测试失败');
  }
}
watch([tenantID, applicationID], () => {
  rows.value = [];
  visible.value = false;
  editing.value = undefined;
  secret.value = '';
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">Webhook 订阅</h2>
          <p class="mb-0 text-#999">配置事件过滤、超时和重试；签名密钥创建或轮换后仅显示一次。</p>
        </div>
        <ElButton type="primary" :disabled="!scopeReady" @click="open()">新建订阅</ElButton>
      </div>
    </template>
    <ElAlert
      v-if="secret"
      :title="`请立即保存签名密钥：${secret}`"
      type="warning"
      show-icon
      :closable="false"
      class="mb-16px"
    />
    <ElAlert v-if="!tenantID" title="请先选择租户" type="warning" :closable="false" />
    <ElAlert
      v-else-if="!applicationID"
      title="请先从应用选择页进入一个应用"
      type="warning"
      show-icon
      :closable="false"
    />
    <template v-else>
      <ElAlert :title="`当前应用：${applicationName}`" type="info" show-icon :closable="false" class="mb-16px" />
      <ElForm inline>
        <ElFormItem label="搜索"><ElInput v-model="search" /></ElFormItem>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="load">查询</ElButton>
      </ElForm>
      <ElForm inline>
        <ElFormItem label="测试负载"><ElInput v-model="testPayload" class="w-360px" /></ElFormItem>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="name" label="名称" />
        <ElTableColumn prop="endpoint_url" label="地址" min-width="240" />
        <ElTableColumn prop="subject_filter" label="事件过滤" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn label="操作" width="250">
          <template #default="{ row }">
            <ElButton link @click="open(row)">编辑</ElButton>
            <ElButton link @click="test(row)">测试</ElButton>
            <ElButton link @click="rotate(row)">轮换密钥</ElButton>
            <ElButton link type="danger" @click="remove(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </template>
  </ElCard>
  <ElDialog v-model="visible" :title="editing ? '编辑订阅' : '新建订阅'">
    <ElForm label-width="110px">
      <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="回调地址"><ElInput v-model="form.endpointURL" /></ElFormItem>
      <ElFormItem label="事件过滤"><ElInput v-model="form.subjectFilter" /></ElFormItem>
      <ElFormItem v-if="editing" label="状态">
        <ElSelect v-model="form.status">
          <ElOption v-for="v in ['active', 'paused', 'disabled']" :key="v" :label="v" :value="v" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="超时(ms)"><ElInputNumber v-model="form.timeoutMS" :min="100" /></ElFormItem>
      <ElFormItem label="最大尝试"><ElInputNumber v-model="form.maxAttempts" :min="1" /></ElFormItem>
      <ElFormItem label="初始退避(秒)"><ElInputNumber v-model="form.retryInitialSeconds" :min="1" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton type="primary" @click="save">保存</ElButton>
    </template>
  </ElDialog>
</template>
