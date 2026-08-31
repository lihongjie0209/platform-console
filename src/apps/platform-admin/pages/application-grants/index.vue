<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { Application, ApplicationGrant, ApplicationGrantForm, TenantDirectoryItem } from '../../api';
import {
  grantApplication,
  listApplications,
  listTenantApplicationGrants,
  listTenantDirectory,
  revokeApplicationGrant
} from '../../api';
import { parseJSONRecord } from '../../metadata';

defineOptions({ name: 'PlatformAdminApplicationGrants' });

interface GrantRow extends Application {
  grant?: ApplicationGrant;
}

const loading = ref(false);
const submitting = ref(false);
const tenants = ref<TenantDirectoryItem[]>([]);
const applications = ref<Application[]>([]);
const grants = ref<ApplicationGrant[]>([]);
const tenantID = ref('');
const keyword = ref('');
const dialogVisible = ref(false);
const editingApplication = ref<GrantRow>();
const formRef = ref<FormInstance>();
const form = reactive<ApplicationGrantForm>(emptyForm());

const rows = computed<GrantRow[]>(() => {
  const grantByApplication = new Map(grants.value.map(item => [String(item.application_id), item]));
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return applications.value
    .map(application => ({ ...application, grant: grantByApplication.get(String(application.id)) }))
    .filter(item => {
      if (!normalizedKeyword) return true;
      return (
        String(item.name).toLowerCase().includes(normalizedKeyword) ||
        String(item.code).toLowerCase().includes(normalizedKeyword)
      );
    });
});

const rules: FormRules<ApplicationGrantForm> = {
  source: [{ required: true, message: '请输入授权来源', trigger: 'blur' }],
  entitlements_json: [
    {
      validator: (_rule, value, callback) => {
        try {
          parseJSONRecord(String(value || ''), 'entitlements_json');
          callback();
        } catch {
          callback(new Error('请输入有效的 JSON 对象'));
        }
      },
      trigger: 'blur'
    }
  ]
};

function emptyForm(): ApplicationGrantForm {
  return { source: 'platform-console', valid_from: '', valid_until: '', entitlements_json: '{}' };
}

async function loadCatalogs() {
  const [tenantPage, applicationPage] = await Promise.all([
    listTenantDirectory({ page: 1, pageSize: 100 }),
    listApplications(1, 100)
  ]);
  tenants.value = tenantPage.items;
  applications.value = applicationPage.items;
  if (!tenants.value.some(item => item.id === tenantID.value)) tenantID.value = tenants.value[0]?.id || '';
}

async function loadGrants() {
  if (!tenantID.value) {
    grants.value = [];
    return;
  }
  loading.value = true;
  try {
    const result = await listTenantApplicationGrants(tenantID.value);
    grants.value = result.grants.items;
  } finally {
    loading.value = false;
  }
}

function openGrant(row: GrantRow) {
  editingApplication.value = row;
  Object.assign(form, {
    ...emptyForm(),
    source: String(row.grant?.source || 'platform-console'),
    valid_from: String(row.grant?.valid_from || ''),
    valid_until: String(row.grant?.valid_until || ''),
    entitlements_json:
      typeof row.grant?.entitlements_json === 'string'
        ? row.grant.entitlements_json
        : JSON.stringify(row.grant?.entitlements_json || {})
  });
  formRef.value?.clearValidate();
  dialogVisible.value = true;
}

async function submitGrant() {
  if (!(await formRef.value?.validate()) || !editingApplication.value?.id) return;
  if (form.valid_from && form.valid_until && new Date(form.valid_until) <= new Date(form.valid_from)) {
    window.$message?.warning('授权结束时间必须晚于开始时间');
    return;
  }
  submitting.value = true;
  try {
    await grantApplication({
      tenantID: tenantID.value,
      applicationID: String(editingApplication.value.id),
      form,
      version: Number(editingApplication.value.grant?.version || 0)
    });
    dialogVisible.value = false;
    window.$message?.success(editingApplication.value.grant ? '授权已更新' : '应用已授权');
    await loadGrants();
  } finally {
    submitting.value = false;
  }
}

async function revoke(row: GrantRow) {
  if (!row.id || !row.grant?.version) return;
  await revokeApplicationGrant(tenantID.value, String(row.id), Number(row.grant.version));
  window.$message?.success('应用授权已撤销');
  await loadGrants();
}

function grantStatusType(status?: unknown) {
  if (status === 'active') return 'success';
  if (status === 'revoked') return 'danger';
  return 'info';
}

watch(tenantID, loadGrants);
onMounted(loadCatalogs);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">租户应用授权</h2>
          <p class="mb-0 mt-6px text-13px text-#999">为租户分配应用，更新和撤销均使用当前授权版本。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSelect v-model="tenantID" class="w-260px" filterable placeholder="选择租户">
            <ElOption
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="`${tenant.name} (${tenant.code})`"
              :value="tenant.id"
            />
          </ElSelect>
          <ElInput v-model="keyword" class="w-220px" clearable placeholder="搜索应用" />
          <ElButton :loading="loading" @click="loadGrants">刷新</ElButton>
        </div>
      </div>
    </template>

    <ElEmpty v-if="!tenants.length" description="暂无可管理租户" />
    <ElTable v-else v-loading="loading" :data="rows" border stripe>
      <ElTableColumn prop="code" label="应用编码" min-width="160" />
      <ElTableColumn prop="name" label="应用名称" min-width="160" />
      <ElTableColumn label="授权状态" width="120">
        <template #default="{ row }">
          <ElTag :type="grantStatusType(row.grant?.status)" effect="plain">{{ row.grant?.status || '未授权' }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="有效期" min-width="260">
        <template #default="{ row }">
          <span v-if="row.grant">{{ row.grant.valid_from || '-' }} 至 {{ row.grant.valid_until || '长期' }}</span>
          <span v-else>-</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="版本" width="90">
        <template #default="{ row }">{{ row.grant?.version || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <ElButton link type="primary" @click="openGrant(row)">{{ row.grant ? '编辑' : '授权' }}</ElButton>
          <ElPopconfirm v-if="row.grant?.status === 'active'" title="确认撤销该租户的应用授权？" @confirm="revoke(row)">
            <template #reference><ElButton link type="danger">撤销</ElButton></template>
          </ElPopconfirm>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>

  <ElDialog v-model="dialogVisible" :title="`应用授权：${editingApplication?.name || ''}`" width="600px">
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="授权来源" prop="source"><ElInput v-model="form.source" /></ElFormItem>
      <div class="grid grid-cols-2 gap-x-12px">
        <ElFormItem label="开始时间">
          <ElDatePicker
            v-model="form.valid_from"
            class="w-full"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="结束时间">
          <ElDatePicker
            v-model="form.valid_until"
            class="w-full"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            clearable
          />
        </ElFormItem>
      </div>
      <ElFormItem label="权益 JSON" prop="entitlements_json">
        <ElInput v-model="form.entitlements_json" type="textarea" :rows="6" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="submitGrant">保存</ElButton>
    </template>
  </ElDialog>
</template>
