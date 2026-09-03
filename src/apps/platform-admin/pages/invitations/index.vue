<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { confirmUserAction } from '@/platform/user-action';
import type { Invitation, InvitationForm } from '../../api';
import { createInvitation, getInvitation, listInvitations, revokeInvitation } from '../../api';

defineOptions({ name: 'PlatformAdminInvitations' });
const platformStore = usePlatformStore();
const loading = ref(false);
const submitting = ref(false);
const rows = ref<Invitation[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const createVisible = ref(false);
const tokenVisible = ref(false);
const invitationToken = ref('');
const formRef = ref<FormInstance>();
const form = reactive<InvitationForm>({ email: '', expires_in_hours: 24 });
const tenantID = computed(() => platformStore.selectedTenantId);
const canCreateInvitation = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.invitation.create' })
);
const canRevokeInvitation = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.invitation.revoke' })
);
const canReadInvitation = computed(() =>
  platformStore.hasPermission({ scope: 'tenant', codes: 'tenant.invitation.read' })
);
const rules: FormRules<InvitationForm> = {
  email: [{ required: true, type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
  expires_in_hours: [
    { required: true, type: 'number', min: 1, max: 720, message: '有效期必须为 1 到 720 小时', trigger: 'change' }
  ]
};

async function loadData() {
  if (!tenantID.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await listInvitations(tenantID.value, page.value, pageSize.value);
    rows.value = result.invitations;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}
function openCreate() {
  if (!canCreateInvitation.value) return;
  Object.assign(form, { email: '', expires_in_hours: 24 });
  formRef.value?.clearValidate();
  createVisible.value = true;
}
async function submit() {
  if (!canCreateInvitation.value || !(await formRef.value?.validate())) return;
  submitting.value = true;
  try {
    const result = await createInvitation(tenantID.value, form);
    invitationToken.value = String(result.token || '');
    createVisible.value = false;
    tokenVisible.value = true;
    await loadData();
  } finally {
    submitting.value = false;
  }
}
async function revoke(row: Invitation) {
  if (!canRevokeInvitation.value || !canReadInvitation.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`确认撤销发给“${row.email}”的邀请吗？`, '撤销邀请', { type: 'warning' })
  );
  if (!confirmed) return;
  const current = await getInvitation(String(row.id));
  if (current.status !== 'pending') {
    window.$message?.warning('邀请状态已发生变化，请刷新后重试');
    await loadData();
    return;
  }
  await revokeInvitation(String(current.id), Number(current.version));
  window.$message?.success('邀请已撤销');
  await loadData();
}
async function copyToken() {
  await navigator.clipboard.writeText(invitationToken.value);
  window.$message?.success('邀请令牌已复制');
}
function closeToken() {
  invitationToken.value = '';
  tokenVisible.value = false;
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
function statusType(status: unknown) {
  if (status === 'pending') return 'warning';
  if (status === 'accepted') return 'success';
  return 'danger';
}
watch(tenantID, () => {
  page.value = 1;
  loadData();
});
onMounted(loadData);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">租户邀请</h2>
          <p class="mb-0 mt-6px text-13px text-#999">邀请令牌只在创建成功后展示一次，平台不保存明文令牌。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElButton :loading="loading" @click="loadData">刷新</ElButton>
          <ElButton v-if="canCreateInvitation" type="primary" :disabled="!tenantID" @click="openCreate">
            创建邀请
          </ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="email" label="邮箱" min-width="220" />
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">
            <ElTag :type="statusType(row.status)" effect="plain">{{ row.status }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="expires_at" label="过期时间" min-width="190" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn prop="accepted_by_user_id" label="接受用户" min-width="180">
          <template #default="{ row }">{{ row.accepted_by_user_id || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn prop="version" label="版本" width="90" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElPopconfirm
              v-if="canRevokeInvitation && canReadInvitation && row.status === 'pending'"
              title="确认撤销该邀请？"
              @confirm="revoke(row)"
            >
              <template #reference><ElButton link type="danger">撤销</ElButton></template>
            </ElPopconfirm>
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
    </template>
  </ElCard>

  <ElDialog v-model="createVisible" title="创建租户邀请" width="520px">
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="邮箱" prop="email"><ElInput v-model="form.email" /></ElFormItem>
      <ElFormItem label="有效期（小时）" prop="expires_in_hours">
        <ElInputNumber v-model="form.expires_in_hours" :min="1" :max="720" class="w-full" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="createVisible = false">取消</ElButton>
      <ElButton v-if="canCreateInvitation" type="primary" :loading="submitting" @click="submit">创建</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    :model-value="tokenVisible"
    title="请立即保存邀请令牌"
    width="620px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="关闭后无法再次查看此令牌，请通过安全渠道发送给受邀用户。"
    />
    <ElInput :model-value="invitationToken" type="textarea" :rows="5" readonly />
    <template #footer>
      <ElButton type="primary" @click="copyToken">复制令牌</ElButton>
      <ElButton @click="closeToken">我已保存并关闭</ElButton>
    </template>
  </ElDialog>
</template>
