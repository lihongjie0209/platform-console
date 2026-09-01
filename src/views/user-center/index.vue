<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import { fetchChangePassword, fetchOwnSessions, fetchRevokeOwnSession } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { validatePasswordChange } from '@/platform/password-policy';
import { canRevokeSession, isCurrentSession } from '@/platform/session-view';
import { BizCopyText } from '@/components/business';

defineOptions({ name: 'UserCenter' });

const authStore = useAuthStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const sessionsLoading = ref(false);
const revokingSessionID = ref('');
const sessions = ref<Api.Auth.Session[]>([]);
const sessionTotal = ref(0);
const sessionPage = ref(1);
const sessionPageSize = ref(10);
const sessionStatus = ref('active');
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' });
const rules: FormRules<typeof form> = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    {
      validator: (_rule, _value, callback) => {
        const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
        if (message && message !== '两次输入的新密码不一致') callback(new Error(message));
        else callback();
      },
      trigger: ['blur', 'change']
    }
  ],
  confirmPassword: [
    {
      validator: (_rule, _value, callback) => {
        const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
        if (message === '两次输入的新密码不一致') callback(new Error(message));
        else callback();
      },
      trigger: ['blur', 'change']
    }
  ]
};

function resetForm() {
  form.currentPassword = '';
  form.newPassword = '';
  form.confirmPassword = '';
  formRef.value?.clearValidate();
}

async function changePassword() {
  const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
  if (message) {
    window.$message?.error(message);
    return;
  }
  await formRef.value?.validate();
  submitting.value = true;
  try {
    const { data, error } = await fetchChangePassword(form.currentPassword, form.newPassword);
    if (error) return;
    resetForm();
    const suffix = data.revoked_sessions > 0 ? `，已退出其他 ${data.revoked_sessions} 个会话` : '';
    window.$message?.success(`密码修改成功${suffix}`);
    await loadSessions();
  } finally {
    submitting.value = false;
  }
}

function sessionStatusType(status: string) {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'warning';
  return 'danger';
}

function sessionStatusLabel(status: string) {
  if (status === 'active') return '活跃';
  if (status === 'expired') return '已过期';
  if (status === 'revoked') return '已撤销';
  return status;
}

function formatTime(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';
}

async function loadSessions() {
  sessionsLoading.value = true;
  try {
    const { data, error } = await fetchOwnSessions(sessionStatus.value, sessionPage.value, sessionPageSize.value);
    if (error) return;
    sessions.value = data.items || [];
    sessionTotal.value = data.total || 0;
  } finally {
    sessionsLoading.value = false;
  }
}

function searchSessions() {
  sessionPage.value = 1;
  loadSessions();
}

function changeSessionPage(value: number) {
  sessionPage.value = value;
  loadSessions();
}

function changeSessionPageSize(value: number) {
  sessionPage.value = 1;
  sessionPageSize.value = value;
  loadSessions();
}

async function revokeSession(session: Api.Auth.Session) {
  if (!canRevokeSession(session, authStore.userInfo.session_id)) return;
  await ElMessageBox.confirm('撤销后，该设备需要重新登录。确认撤销此会话吗？', '撤销会话', {
    type: 'warning',
    confirmButtonText: '确认撤销',
    cancelButtonText: '取消'
  });
  revokingSessionID.value = session.session_id;
  try {
    const { error } = await fetchRevokeOwnSession(session.session_id, session.version);
    if (error) return;
    window.$message?.success('会话已撤销');
    await loadSessions();
  } finally {
    revokingSessionID.value = '';
  }
}

onMounted(loadSessions);
</script>

<template>
  <ElSpace direction="vertical" fill :size="16" class="w-full">
    <ElCard shadow="never">
      <template #header><span class="font-600">账号信息</span></template>
      <ElDescriptions :column="2" border>
        <ElDescriptionsItem label="用户名">{{ authStore.userInfo.username || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="显示名称">{{ authStore.userInfo.display_name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="邮箱">{{ authStore.userInfo.email || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="手机">{{ authStore.userInfo.phone || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="账号状态">
          <ElTag :type="authStore.userInfo.status === 'active' ? 'success' : 'warning'">
            {{ authStore.userInfo.status || '-' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="用户 ID"><BizCopyText :value="authStore.userInfo.subject" /></ElDescriptionsItem>
        <ElDescriptionsItem label="当前租户">
          <BizCopyText v-if="authStore.userInfo.tenant_id" :value="authStore.userInfo.tenant_id" />
          <span v-else>-</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="成员 ID">
          <BizCopyText v-if="authStore.userInfo.membership_id" :value="authStore.userInfo.membership_id" />
          <span v-else>-</span>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard shadow="never">
      <template #header>
        <div class="flex-y-center justify-between gap-12px">
          <div>
            <div class="font-600">我的会话</div>
            <div class="mt-4px text-12px text-#999">查看账号的登录会话，并撤销不再使用的设备。</div>
          </div>
          <ElButton :loading="sessionsLoading" @click="loadSessions">刷新</ElButton>
        </div>
      </template>

      <div class="mb-16px flex items-center gap-8px">
        <span class="text-14px">状态</span>
        <ElSelect v-model="sessionStatus" clearable class="w-140px" placeholder="全部" @change="searchSessions">
          <ElOption label="活跃" value="active" />
          <ElOption label="已撤销" value="revoked" />
          <ElOption label="已过期" value="expired" />
        </ElSelect>
      </div>

      <ElTable v-loading="sessionsLoading" :data="sessions" border stripe>
        <ElTableColumn label="会话 ID" min-width="330">
          <template #default="{ row }">
            <div class="flex-y-center gap-8px">
              <BizCopyText :value="row.session_id" />
              <ElTag v-if="isCurrentSession(row, authStore.userInfo.session_id)" type="primary" effect="plain">
                当前
              </ElTag>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="作用域" min-width="220">
          <template #default="{ row }">
            <BizCopyText v-if="row.tenant_id" :value="row.tenant_id" />
            <span v-else>平台级</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">
            <ElTag :type="sessionStatusType(row.status)" effect="plain">
              {{ sessionStatusLabel(row.status) }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="最后使用" min-width="180">
          <template #default="{ row }">{{ formatTime(row.last_used_at) }}</template>
        </ElTableColumn>
        <ElTableColumn label="过期时间" min-width="180">
          <template #default="{ row }">{{ formatTime(row.expires_at) }}</template>
        </ElTableColumn>
        <ElTableColumn label="撤销原因" min-width="180">
          <template #default="{ row }">{{ row.revoke_reason || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="canRevokeSession(row, authStore.userInfo.session_id)"
              link
              type="danger"
              :loading="revokingSessionID === row.session_id"
              @click="revokeSession(row)"
            >
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
          :total="sessionTotal"
          :current-page="sessionPage"
          :page-size="sessionPageSize"
          :page-sizes="[10, 20, 50, 100]"
          @update:current-page="changeSessionPage"
          @update:page-size="changeSessionPageSize"
        />
      </div>
    </ElCard>

    <ElCard shadow="never">
      <template #header>
        <div>
          <div class="font-600">修改密码</div>
          <div class="mt-4px text-12px text-#999">修改成功后保留当前会话，并撤销该账号的其他有效会话。</div>
        </div>
      </template>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px" class="max-w-560px">
        <ElFormItem label="当前密码" prop="currentPassword">
          <ElInput v-model="form.currentPassword" type="password" show-password autocomplete="current-password" />
        </ElFormItem>
        <ElFormItem label="新密码" prop="newPassword">
          <ElInput v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
          <div class="text-12px text-#999">至少 12 字节，支持最长 1024 字节。</div>
        </ElFormItem>
        <ElFormItem label="确认新密码" prop="confirmPassword">
          <ElInput v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="submitting" @click="changePassword">确认修改</ElButton>
          <ElButton :disabled="submitting" @click="resetForm">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </ElSpace>
</template>

<style scoped></style>
