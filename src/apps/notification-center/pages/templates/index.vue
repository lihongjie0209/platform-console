<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { NotificationTemplate } from '../../api';
import { getTemplate, listTemplates, putTemplate } from '../../api';

defineOptions({ name: 'NotificationCenterTemplates' });
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const loading = ref(false);
const saving = ref(false);
const rows = ref<NotificationTemplate[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const channel = ref('');
const status = ref('');
const visible = ref(false);
const form = reactive({
  code: '',
  channel: 'email',
  locale: 'zh-cn',
  subject: '',
  content: '',
  status: 'active',
  version: 0
});
const loadGuard = createLatestRequestGuard();
const canUpdate = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'notification.template.update' })
);
const canRead = computed(() => platformStore.hasPermission({ scope: 'tenant', codes: 'notification.template.read' }));

async function loadData() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await listTemplates({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      keyword: keyword.value,
      channel: channel.value,
      status: status.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (loadGuard.isCurrent(request)) {
      rows.value = result.templates || [];
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
async function edit(row?: NotificationTemplate) {
  if (!canUpdate.value) return;
  if (row && !canRead.value) return;
  const value = row ? await getTemplate(row) : undefined;
  Object.assign(
    form,
    value || {
      code: '',
      channel: 'email',
      locale: 'zh-cn',
      subject: '',
      content: '',
      status: 'active',
      version: 0
    }
  );
  visible.value = true;
}
async function save() {
  if (!canUpdate.value || !scopeReady.value || !form.code.trim() || !form.content) return;
  saving.value = true;
  try {
    await putTemplate(tenantID.value, applicationID.value, form);
    visible.value = false;
    window.$message?.success('模板已保存');
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
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0 text-18px font-semibold">通知模板</h2>
          <p class="mb-0 mt-6px text-13px text-#999">维护 {{ applicationName }} 的多渠道、多语言模板。</p>
        </div>
        <ElButton v-if="canUpdate" type="primary" :disabled="!scopeReady" @click="edit()">新建模板</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline class="mb-16px" @submit.prevent="search">
        <ElFormItem label="搜索"><ElInput v-model="keyword" clearable placeholder="编码或主题" /></ElFormItem>
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
        <ElTableColumn prop="code" label="模板编码" min-width="180" />
        <ElTableColumn prop="channel" label="渠道" width="110" />
        <ElTableColumn prop="locale" label="语言" width="100" />
        <ElTableColumn prop="subject" label="主题" min-width="200" />
        <ElTableColumn prop="status" label="状态" width="100" />
        <ElTableColumn prop="version" label="版本" width="80" />
        <ElTableColumn prop="updated_at" label="更新时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <ElButton v-if="canUpdate && canRead" link type="primary" @click="edit(row)">编辑</ElButton>
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
  <ElDialog v-model="visible" :title="form.version ? '编辑模板' : '新建模板'" width="720px">
    <ElForm label-width="90px">
      <ElFormItem label="编码" required><ElInput v-model="form.code" :disabled="form.version > 0" /></ElFormItem>
      <ElFormItem label="渠道" required>
        <ElSelect v-model="form.channel" :disabled="form.version > 0">
          <ElOption v-for="item in ['email', 'sms', 'webhook', 'in_app']" :key="item" :label="item" :value="item" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="语言" required><ElInput v-model="form.locale" :disabled="form.version > 0" /></ElFormItem>
      <ElFormItem label="主题"><ElInput v-model="form.subject" /></ElFormItem>
      <ElFormItem label="内容" required>
        <ElInput
          v-model="form.content"
          type="textarea"
          :rows="10"
          placeholder="支持 Go template，例如 Hello {{.name}}"
        />
      </ElFormItem>
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
