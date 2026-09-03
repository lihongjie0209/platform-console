<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { remoteSearchPage } from '@/platform/remote-search';
import { confirmUserAction } from '@/platform/user-action';
import type { Application, ApplicationGrant, ApplicationGrantForm, TenantDirectoryItem } from '../../api';
import {
  batchGetTenantApplicationGrants,
  grantApplication,
  listTenantDirectory,
  revokeApplicationGrant,
  searchApplications
} from '../../api';
import { parseJSONRecord } from '../../metadata';

defineOptions({ name: 'PlatformAdminApplicationGrants' });

interface GrantRow extends Application {
  grant?: ApplicationGrant;
}

const loading = ref(false);
const submitting = ref(false);
const tenantSearching = ref(false);
const tenants = ref<TenantDirectoryItem[]>([]);
const applications = ref<Application[]>([]);
const grants = ref<ApplicationGrant[]>([]);
const tenantID = ref('');
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const dialogVisible = ref(false);
const editingApplication = ref<GrantRow>();
const formRef = ref<FormInstance>();
const form = reactive<ApplicationGrantForm>(emptyForm());
const platformStore = usePlatformStore();
const canGrant = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'application.grant.grant' }));
const canRevoke = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'application.grant.revoke' }));

const rows = computed<GrantRow[]>(() => {
  const grantByApplication = new Map(grants.value.map(item => [String(item.application_id), item]));
  return applications.value.map(application => ({
    ...application,
    grant: grantByApplication.get(String(application.id))
  }));
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
  const result = await listTenantDirectory({ ...remoteSearchPage(20) });
  tenants.value = result.items;
  if (!tenants.value.some(item => item.id === tenantID.value)) tenantID.value = tenants.value[0]?.id || '';
  await loadApplications();
}

async function loadApplications() {
  if (!tenantID.value) {
    grants.value = [];
    applications.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await searchApplications({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim()
    });
    applications.value = result.items;
    total.value = result.total;
    const applicationIDs = result.items.map(item => String(item.id));
    grants.value = applicationIDs.length
      ? (await batchGetTenantApplicationGrants(tenantID.value, applicationIDs)).items
      : [];
  } finally {
    loading.value = false;
  }
}
async function searchTenants(value = '') {
  tenantSearching.value = true;
  try {
    const result = await listTenantDirectory({ ...remoteSearchPage(20), keyword: value });
    const values = new Map(tenants.value.map(item => [item.id, item]));
    for (const item of result.items) values.set(item.id, item);
    tenants.value = [...values.values()];
  } finally {
    tenantSearching.value = false;
  }
}
async function searchApplicationsPage() {
  page.value = 1;
  await loadApplications();
}
async function changePage(value: number) {
  page.value = value;
  await loadApplications();
}
async function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  await loadApplications();
}

function openGrant(row: GrantRow) {
  if (!canGrant.value) return;
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
  if (!canGrant.value || !(await formRef.value?.validate()) || !editingApplication.value?.id) return;
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
    await loadApplications();
  } finally {
    submitting.value = false;
  }
}

async function revoke(row: GrantRow) {
  if (!canRevoke.value || !row.id || !row.grant?.version) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`撤销后租户将无法继续使用“${row.name}”，确认继续吗？`, '撤销应用授权', {
      type: 'warning'
    })
  );
  if (!confirmed) return;
  await revokeApplicationGrant(tenantID.value, String(row.id), Number(row.grant.version));
  window.$message?.success('应用授权已撤销');
  await loadApplications();
}

function grantStatusType(status?: unknown) {
  if (status === 'active') return 'success';
  if (status === 'revoked') return 'danger';
  return 'info';
}

watch(tenantID, async () => {
  page.value = 1;
  await loadApplications();
});
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
          <ElSelect
            v-model="tenantID"
            class="w-260px"
            filterable
            remote
            :remote-method="searchTenants"
            :loading="tenantSearching"
            reserve-keyword
            placeholder="选择租户"
          >
            <ElOption
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="`${tenant.name} (${tenant.code})`"
              :value="tenant.id"
            />
          </ElSelect>
          <ElInput
            v-model="keyword"
            class="w-220px"
            clearable
            placeholder="搜索应用"
            @keyup.enter="searchApplicationsPage"
            @clear="searchApplicationsPage"
          />
          <ElButton @click="searchApplicationsPage">搜索</ElButton>
          <ElButton :loading="loading" @click="loadApplications">刷新</ElButton>
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
          <ElButton v-if="canGrant" link type="primary" @click="openGrant(row)">
            {{ row.grant ? '编辑' : '授权' }}
          </ElButton>
          <ElPopconfirm
            v-if="canRevoke && row.grant?.status === 'active'"
            title="确认撤销该租户的应用授权？"
            @confirm="revoke(row)"
          >
            <template #reference><ElButton link type="danger">撤销</ElButton></template>
          </ElPopconfirm>
        </template>
      </ElTableColumn>
    </ElTable>
    <div v-if="tenants.length" class="mt-16px flex justify-end">
      <ElPagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @update:current-page="changePage"
        @update:page-size="changePageSize"
      />
    </div>
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
      <ElButton v-if="canGrant" type="primary" :loading="submitting" @click="submitGrant">保存</ElButton>
    </template>
  </ElDialog>
</template>
