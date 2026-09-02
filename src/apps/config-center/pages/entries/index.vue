<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { ConfigDraftInput, ConfigEntry } from '../../api';
import {
  approveConfig,
  listConfigEntries,
  publishConfig,
  putConfigDraft,
  rejectConfig,
  rollbackConfig,
  submitConfig
} from '../../api';
import { parseConfigJSON, validateSecretReference } from '../../draft';

defineOptions({ name: 'ConfigCenterEntries' });

const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const applicationID = computed(() => platformStore.selectedApplicationId);
const applicationName = computed(() => platformStore.selectedApplication?.name || '当前应用');
const loading = ref(false);
const saving = ref(false);
const rows = ref<ConfigEntry[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const environment = ref('development');
const serviceName = ref('');
const editorVisible = ref(false);
const valueMode = ref<'json' | 'secret'>('json');
const form = reactive({ id: '', key: '', jsonValue: '{}', secretRef: '', rolloutPercentage: 100, version: 0 });
const loadGuard = createLatestRequestGuard();

const scopeReady = computed(
  () =>
    hasApplicationScope(tenantID.value, applicationID.value) && Boolean(environment.value && serviceName.value.trim())
);

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
    const result = await listConfigEntries(
      {
        environment: environment.value,
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        service: serviceName.value.trim()
      },
      page.value,
      pageSize.value
    );
    if (loadGuard.isCurrent(request)) {
      rows.value = result.entries || [];
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

function openCreate() {
  Object.assign(form, { id: '', key: '', jsonValue: '{}', secretRef: '', rolloutPercentage: 100, version: 0 });
  valueMode.value = 'json';
  editorVisible.value = true;
}

function openEdit(entry: ConfigEntry) {
  Object.assign(form, {
    id: entry.id,
    key: entry.key,
    jsonValue: JSON.stringify(entry.value ?? {}, null, 2),
    secretRef: entry.secret_ref || '',
    rolloutPercentage: entry.rollout_percentage,
    version: entry.version
  });
  valueMode.value = entry.secret_ref ? 'secret' : 'json';
  editorVisible.value = true;
}

async function saveDraft() {
  if (!scopeReady.value || !form.key.trim()) return;
  let value: unknown;
  if (valueMode.value === 'json') {
    try {
      value = parseConfigJSON(form.jsonValue);
    } catch (error) {
      window.$message?.error(error instanceof Error ? error.message : '配置值不是合法 JSON');
      return;
    }
  }
  let secretRef: string | undefined;
  if (valueMode.value === 'secret') {
    try {
      secretRef = validateSecretReference(form.secretRef);
    } catch (error) {
      window.$message?.error(error instanceof Error ? error.message : 'Secret 引用不能为空');
      return;
    }
  }
  saving.value = true;
  try {
    const input: ConfigDraftInput = {
      id: form.id || undefined,
      environment: environment.value,
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      service: serviceName.value.trim(),
      key: form.key.trim(),
      value,
      secretRef,
      rolloutPercentage: form.rolloutPercentage,
      expectedVersion: form.version
    };
    await putConfigDraft(input);
    editorVisible.value = false;
    window.$message?.success('草稿已保存');
    await loadData();
  } finally {
    saving.value = false;
  }
}

async function runAction(action: () => Promise<ConfigEntry>, message: string) {
  await action();
  window.$message?.success(message);
  await loadData();
}

async function review(entry: ConfigEntry, approve: boolean) {
  try {
    const result = await ElMessageBox.prompt(
      approve ? '填写审批意见（可选）' : '填写驳回原因',
      approve ? '审批配置' : '驳回配置',
      {
        inputValidator: value => approve || Boolean(value?.trim()) || '驳回原因不能为空'
      }
    );
    await runAction(
      () => (approve ? approveConfig(entry, result.value || '') : rejectConfig(entry, result.value || '')),
      approve ? '审批通过' : '已驳回'
    );
  } catch {
    // User cancelled the prompt.
  }
}

async function rollback(entry: ConfigEntry) {
  try {
    const result = await ElMessageBox.prompt('输入需要恢复的历史修订号', '回滚配置', {
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '请输入正整数修订号'
    });
    await runAction(() => rollbackConfig(entry, Number(result.value)), '配置已回滚');
  } catch {
    // User cancelled the prompt.
  }
}

function statusType(status: string) {
  if (status === 'published' || status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'pending_approval') return 'warning';
  return 'info';
}

watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  editorVisible.value = false;
  search();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">动态配置</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            管理 {{ applicationName }} 的配置覆盖，支持审批、发布、灰度与回滚。
          </p>
        </div>
        <ElButton type="primary" :disabled="!scopeReady" @click="openCreate">新建配置</ElButton>
      </div>
    </template>

    <ElAlert
      v-if="!hasApplicationScope(tenantID, applicationID)"
      title="请先选择租户和应用"
      type="warning"
      show-icon
      :closable="false"
    />
    <template v-else>
      <ElForm inline class="mb-16px" @submit.prevent="search">
        <ElFormItem label="环境">
          <ElSelect v-model="environment" class="w-150px">
            <ElOption label="开发" value="development" />
            <ElOption label="测试" value="testing" />
            <ElOption label="预发布" value="staging" />
            <ElOption label="生产" value="production" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="服务" required>
          <ElInput v-model="serviceName" class="w-240px" clearable placeholder="例如 billing-service" />
        </ElFormItem>
        <ElFormItem><ElButton type="primary" @click="search">查询</ElButton></ElFormItem>
      </ElForm>

      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="key" label="配置键" min-width="220" />
        <ElTableColumn label="配置值" min-width="260">
          <template #default="{ row }">
            <code v-if="row.secret_ref">Secret: {{ row.secret_ref }}</code>
            <code v-else class="break-all">{{ JSON.stringify(row.value) }}</code>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="130">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="revision" label="修订" width="80" />
        <ElTableColumn prop="published_revision" label="已发布" width="90" />
        <ElTableColumn prop="rollout_percentage" label="灰度 %" width="90" />
        <ElTableColumn prop="updated_by" label="更新人" min-width="140" />
        <ElTableColumn prop="updated_at" label="更新时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="310" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton
              v-if="['draft', 'rejected'].includes(row.status)"
              link
              @click="runAction(() => submitConfig(row), '已提交审批')"
            >
              提交
            </ElButton>
            <template v-if="row.status === 'pending_approval'">
              <ElButton link type="success" @click="review(row, true)">通过</ElButton>
              <ElButton link type="danger" @click="review(row, false)">驳回</ElButton>
            </template>
            <ElButton
              v-if="row.status === 'approved'"
              link
              type="success"
              @click="runAction(() => publishConfig(row), '已发布')"
            >
              发布
            </ElButton>
            <ElButton v-if="row.published_revision > 0" link @click="rollback(row)">回滚</ElButton>
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

  <ElDialog v-model="editorVisible" :title="form.id ? '编辑配置草稿' : '新建配置草稿'" width="680px">
    <ElForm label-width="100px">
      <ElFormItem label="配置键" required><ElInput v-model="form.key" :disabled="Boolean(form.id)" /></ElFormItem>
      <ElFormItem label="值类型">
        <ElRadioGroup v-model="valueMode">
          <ElRadioButton value="json">JSON</ElRadioButton>
          <ElRadioButton value="secret">Secret 引用</ElRadioButton>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem v-if="valueMode === 'json'" label="JSON 值" required>
        <ElInput v-model="form.jsonValue" type="textarea" :rows="10" />
      </ElFormItem>
      <ElFormItem v-else label="Secret 引用" required>
        <ElInput v-model="form.secretRef" placeholder="如 secret://billing/database-password" />
      </ElFormItem>
      <ElFormItem label="灰度比例">
        <ElSlider v-model="form.rolloutPercentage" :min="0" :max="100" show-input />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="editorVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="saving" @click="saveDraft">保存草稿</ElButton>
    </template>
  </ElDialog>
</template>
