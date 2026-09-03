<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { NotificationProvider } from '../../api';
import { listProviders, putProvider } from '../../api';
import { normalizeProviderForm, providerFormError } from '../../provider-form';

defineOptions({ name: 'NotificationCenterProviders' });

const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const canUpdate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'notification.provider.update' })
);
const loading = ref(false);
const saving = ref(false);
const visible = ref(false);
const rows = ref<NotificationProvider[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const channel = ref('');
const status = ref('');
const loadGuard = createLatestRequestGuard();
const form = reactive({
  code: '',
  channel: 'email',
  upstream: '',
  path: '/send',
  priority: 100,
  status: 'active',
  version: 0
});

async function loadData() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await listProviders({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      keyword: keyword.value.trim(),
      channel: channel.value,
      status: status.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (loadGuard.isCurrent(request)) {
      rows.value = result.providers || [];
      total.value = result.total || 0;
    }
  } finally {
    if (loadGuard.isCurrent(request)) loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}

function edit(row?: NotificationProvider) {
  if (!canUpdate.value) return;
  Object.assign(
    form,
    row || { code: '', channel: 'email', upstream: '', path: '/send', priority: 100, status: 'active', version: 0 }
  );
  visible.value = true;
}

async function save() {
  if (!canUpdate.value || !scopeReady.value) return;
  const normalized = normalizeProviderForm(form);
  const error = providerFormError(normalized);
  if (error) {
    window.$message?.warning(error);
    return;
  }
  saving.value = true;
  try {
    await putProvider(tenantID.value, applicationID.value, { ...normalized, version: form.version });
    visible.value = false;
    window.$message?.success('供应商路由已保存');
    await loadData();
  } finally {
    saving.value = false;
  }
}

watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  visible.value = false;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">供应商路由</h2>
          <p class="mb-0 mt-6px text-13px text-#999">维护 {{ applicationName }} 各通知渠道使用的可靠上游。</p>
        </div>
        <ElButton v-if="canUpdate" type="primary" :disabled="!scopeReady" @click="edit()">新增供应商</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElAlert
        class="mb-16px"
        type="info"
        show-icon
        :closable="false"
        title="上游名称必须先由运维写入 notification-service 的环境配置；本页面不会保存 URL、Token 或密钥。"
      />
      <ElForm inline class="mb-16px" @submit.prevent="search">
        <ElFormItem label="搜索"><ElInput v-model="keyword" clearable placeholder="编码或上游名称" /></ElFormItem>
        <ElFormItem label="渠道">
          <ElSelect v-model="channel" clearable class="w-130px">
            <ElOption v-for="item in ['email', 'sms', 'webhook', 'in_app']" :key="item" :label="item" :value="item" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="status" clearable class="w-120px">
            <ElOption label="启用" value="active" />
            <ElOption label="停用" value="disabled" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="code" label="供应商编码" min-width="170" />
        <ElTableColumn prop="channel" label="渠道" width="110" />
        <ElTableColumn prop="upstream" label="上游配置名" min-width="180" />
        <ElTableColumn prop="path" label="请求路径" min-width="180" />
        <ElTableColumn prop="priority" label="优先级" width="90" />
        <ElTableColumn prop="status" label="状态" width="90" />
        <ElTableColumn prop="version" label="版本" width="80" />
        <ElTableColumn prop="updated_at" label="更新时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <ElButton v-if="canUpdate" link type="primary" @click="edit(row)">编辑</ElButton>
            <span v-else>-</span>
          </template>
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

  <ElDialog v-model="visible" :title="form.version ? '编辑供应商路由' : '新增供应商路由'" width="620px">
    <ElForm label-width="110px">
      <ElFormItem label="供应商编码" required><ElInput v-model="form.code" :disabled="form.version > 0" /></ElFormItem>
      <ElFormItem label="通知渠道" required>
        <ElSelect v-model="form.channel" class="w-full">
          <ElOption v-for="item in ['email', 'sms', 'webhook', 'in_app']" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="上游配置名" required>
        <ElInput v-model="form.upstream" placeholder="例如 mail-primary" />
      </ElFormItem>
      <ElFormItem label="请求路径" required><ElInput v-model="form.path" placeholder="例如 /v1/send" /></ElFormItem>
      <ElFormItem label="优先级"><ElInputNumber v-model="form.priority" :min="0" :step="10" /></ElFormItem>
      <ElFormItem label="状态">
        <ElRadioGroup v-model="form.status">
          <ElRadio value="active">启用</ElRadio>
          <ElRadio value="disabled">停用</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="canUpdate" type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>
</template>
