<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCopyText } from '@/components/business';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { TenantDirectoryItem, UserIdentity, UserSession } from '../../api';
import { listSessions, listTenantDirectory, listUsers, revokeSession } from '../../api';

defineOptions({ name: 'PlatformAdminSessions' });

interface RevokeForm {
  reason: string;
}

const platformStore = usePlatformStore();
const loading = ref(false);
const submitting = ref(false);
const rows = ref<UserSession[]>([]);
const users = ref<UserIdentity[]>([]);
const tenants = ref<TenantDirectoryItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const userID = ref('');
const tenantID = ref(platformStore.selectedTenantId);
const status = ref('active');
const revokeVisible = ref(false);
const selected = ref<UserSession>();
const formRef = ref<FormInstance>();
const form = reactive<RevokeForm>({ reason: '' });
const rules: FormRules<RevokeForm> = {
  reason: [{ required: true, message: '请输入撤销原因', trigger: 'blur' }]
};
const userByID = computed(() => new Map(users.value.map(item => [item.id, item])));
const tenantByID = computed(() => new Map(tenants.value.map(item => [item.id, item])));
const canRevokeSession = computed(() =>
  platformStore.hasPermission({ scope: 'platform', codes: 'identity.session.revoke' })
);

function userLabel(id: string) {
  const user = userByID.value.get(id);
  return user ? `${user.display_name || user.username} (${user.username})` : id;
}

function tenantLabel(id: string) {
  if (!id) return '平台级会话';
  const tenant = tenantByID.value.get(id);
  return tenant ? `${tenant.name} (${tenant.code})` : id;
}

function statusType(value: string) {
  if (value === 'active') return 'success';
  if (value === 'expired') return 'warning';
  return 'danger';
}

async function loadCatalogs() {
  const [userPage, tenantPage] = await Promise.all([
    listUsers({ page: 1, pageSize: 100 }),
    listTenantDirectory({ page: 1, pageSize: 100 })
  ]);
  users.value = userPage.items;
  tenants.value = tenantPage.items;
}

async function loadData() {
  loading.value = true;
  try {
    const result = await listSessions({
      page: page.value,
      pageSize: pageSize.value,
      userID: userID.value,
      tenantID: tenantID.value,
      status: status.value
    });
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function search() {
  page.value = 1;
  loadData();
}

function resetSearch() {
  userID.value = '';
  tenantID.value = platformStore.selectedTenantId;
  status.value = 'active';
  search();
}

function openRevoke(row: UserSession) {
  if (!canRevokeSession.value) return;
  selected.value = row;
  form.reason = '';
  formRef.value?.clearValidate();
  revokeVisible.value = true;
}

async function submitRevoke() {
  if (!canRevokeSession.value || !selected.value || !(await formRef.value?.validate())) return;
  submitting.value = true;
  try {
    await revokeSession(selected.value.session_id, form.reason, selected.value.version);
    revokeVisible.value = false;
    selected.value = undefined;
    window.$message?.success('会话已撤销');
    await loadData();
  } finally {
    submitting.value = false;
  }
}

function changePage(value: number) {
  page.value = value;
  loadData();
}

function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  loadData();
}

watch(
  () => platformStore.selectedTenantId,
  value => {
    tenantID.value = value;
    search();
  }
);
onMounted(() => Promise.all([loadCatalogs(), loadData()]));
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">会话安全</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            查看用户登录会话并按安全事件撤销，所有撤销操作均记录操作者和原因。
          </p>
        </div>
        <ElButton :loading="loading" @click="loadData">刷新</ElButton>
      </div>
    </template>

    <ElForm inline class="mb-16px" @submit.prevent="search">
      <ElFormItem label="用户">
        <ElSelect
          v-model="userID"
          clearable
          filterable
          allow-create
          class="w-260px"
          placeholder="全部用户或输入用户 ID"
        >
          <ElOption v-for="user in users" :key="user.id" :label="userLabel(user.id)" :value="user.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="租户">
        <ElSelect
          v-model="tenantID"
          clearable
          filterable
          allow-create
          class="w-260px"
          placeholder="全部租户或输入租户 ID"
        >
          <ElOption v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant.id)" :value="tenant.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="status" clearable class="w-140px" placeholder="全部">
          <ElOption label="活跃" value="active" />
          <ElOption label="已撤销" value="revoked" />
          <ElOption label="已过期" value="expired" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" @click="search">查询</ElButton>
        <ElButton @click="resetSearch">重置</ElButton>
      </ElFormItem>
    </ElForm>

    <ElTable v-loading="loading" :data="rows" border stripe>
      <ElTableColumn label="会话 ID" min-width="330">
        <template #default="{ row }"><BizCopyText :value="row.session_id" /></template>
      </ElTableColumn>
      <ElTableColumn label="用户" min-width="220">
        <template #default="{ row }">{{ userLabel(row.user_id) }}</template>
      </ElTableColumn>
      <ElTableColumn label="租户" min-width="220">
        <template #default="{ row }">{{ tenantLabel(row.tenant_id) }}</template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="110">
        <template #default="{ row }">
          <ElTag :type="statusType(row.status)" effect="plain">{{ row.status }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn prop="last_used_at" label="最后使用" min-width="190" :formatter="formatPlatformTableDateTime" />
      <ElTableColumn prop="expires_at" label="过期时间" min-width="190" :formatter="formatPlatformTableDateTime" />
      <ElTableColumn prop="revoke_reason" label="撤销原因" min-width="180">
        <template #default="{ row }">{{ row.revoke_reason || '-' }}</template>
      </ElTableColumn>
      <ElTableColumn prop="version" label="版本" width="90" />
      <ElTableColumn label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <ElButton v-if="canRevokeSession && row.status === 'active'" link type="danger" @click="openRevoke(row)">
            撤销
          </ElButton>
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
        @update:current-page="changePage"
        @update:page-size="changePageSize"
      />
    </div>
  </ElCard>

  <ElDialog v-model="revokeVisible" title="撤销用户会话" width="560px">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      :title="`将撤销 ${selected ? userLabel(selected.user_id) : ''} 的指定会话，请填写可审计的原因。`"
    />
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="撤销原因" prop="reason">
        <ElInput v-model="form.reason" type="textarea" :rows="4" maxlength="500" show-word-limit />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="revokeVisible = false">取消</ElButton>
      <ElButton v-if="canRevokeSession" type="danger" :loading="submitting" @click="submitRevoke">确认撤销</ElButton>
    </template>
  </ElDialog>
</template>
