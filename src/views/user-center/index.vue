<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import {
  fetchChangePassword,
  fetchConfirmMFASetup,
  fetchDisableMFA,
  fetchMFAStatus,
  fetchOwnSessions,
  fetchRegenerateMFARecoveryCodes,
  fetchRevokeOwnSession,
  fetchStartMFASetup
} from '@/service/api';
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
const mfaLoading = ref(false);
const mfaSubmitting = ref(false);
const mfaStatus = ref<Api.Auth.MFAStatus>({
  available: false,
  enabled: false,
  status: 'disabled',
  recovery_codes_remaining: 0,
  version: 0
});
const mfaSetupVisible = ref(false);
const mfaSetup = ref<Api.Auth.MFASetup>();
const mfaCurrentPassword = ref('');
const mfaConfirmCode = ref('');
const recoveryCodesVisible = ref(false);
const recoveryCodes = ref<string[]>([]);
const mfaDisableVisible = ref(false);
const mfaDisablePassword = ref('');
const mfaDisableCode = ref('');
const mfaRecoveryVisible = ref(false);
const mfaRecoveryPassword = ref('');
const mfaRecoveryCode = ref('');
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

async function loadMFAStatus() {
  mfaLoading.value = true;
  try {
    const { data, error } = await fetchMFAStatus();
    if (!error) mfaStatus.value = data;
  } finally {
    mfaLoading.value = false;
  }
}

function openMFASetup() {
  mfaCurrentPassword.value = '';
  mfaConfirmCode.value = '';
  mfaSetup.value = undefined;
  mfaSetupVisible.value = true;
}

async function startMFASetup() {
  if (!mfaCurrentPassword.value) {
    window.$message?.error('请输入当前密码');
    return;
  }
  mfaSubmitting.value = true;
  try {
    const { data, error } = await fetchStartMFASetup(mfaCurrentPassword.value);
    if (!error) {
      mfaSetup.value = data;
      mfaCurrentPassword.value = '';
    }
  } finally {
    mfaSubmitting.value = false;
  }
}

async function confirmMFASetup() {
  if (!mfaSetup.value || !/^\d{6}$/.test(mfaConfirmCode.value.trim())) {
    window.$message?.error('请输入认证器中的 6 位动态验证码');
    return;
  }
  mfaSubmitting.value = true;
  try {
    const { data, error } = await fetchConfirmMFASetup(mfaConfirmCode.value.trim(), mfaSetup.value.version);
    if (error) return;
    recoveryCodes.value = data.recovery_codes;
    mfaSetupVisible.value = false;
    recoveryCodesVisible.value = true;
    window.$message?.success('多因素认证已启用');
    await Promise.all([loadMFAStatus(), loadSessions()]);
  } finally {
    mfaSubmitting.value = false;
  }
}

function openMFADisable() {
  mfaDisablePassword.value = '';
  mfaDisableCode.value = '';
  mfaDisableVisible.value = true;
}

function openMFARecoveryRotation() {
  mfaRecoveryPassword.value = '';
  mfaRecoveryCode.value = '';
  mfaRecoveryVisible.value = true;
}

async function regenerateMFARecoveryCodes() {
  if (!mfaRecoveryPassword.value || !/^\d{6}$/.test(mfaRecoveryCode.value.trim())) {
    window.$message?.error('请输入当前密码和 6 位动态验证码');
    return;
  }
  mfaSubmitting.value = true;
  try {
    const { data, error } = await fetchRegenerateMFARecoveryCodes(
      mfaRecoveryPassword.value,
      mfaRecoveryCode.value.trim(),
      mfaStatus.value.version
    );
    if (error) return;
    recoveryCodes.value = data.recovery_codes;
    mfaRecoveryVisible.value = false;
    recoveryCodesVisible.value = true;
    window.$message?.success('旧恢复码已全部失效，请立即保存新恢复码');
    await loadMFAStatus();
  } finally {
    mfaSubmitting.value = false;
  }
}

async function disableMFA() {
  if (!mfaDisablePassword.value || !/^\d{6}$/.test(mfaDisableCode.value.trim())) {
    window.$message?.error('请输入当前密码和 6 位动态验证码');
    return;
  }
  mfaSubmitting.value = true;
  try {
    const { error } = await fetchDisableMFA(
      mfaDisablePassword.value,
      mfaDisableCode.value.trim(),
      mfaStatus.value.version
    );
    if (error) return;
    mfaDisableVisible.value = false;
    window.$message?.success('多因素认证已停用');
    await Promise.all([loadMFAStatus(), loadSessions()]);
  } finally {
    mfaSubmitting.value = false;
  }
}

async function copyRecoveryCodes() {
  await navigator.clipboard.writeText(recoveryCodes.value.join('\n'));
  window.$message?.success('恢复码已复制，请保存到安全位置');
}

onMounted(() => Promise.all([loadSessions(), loadMFAStatus()]));
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

    <ElCard v-loading="mfaLoading" shadow="never">
      <template #header>
        <div class="flex-y-center justify-between gap-12px">
          <div>
            <div class="font-600">多因素认证</div>
            <div class="mt-4px text-12px text-#999">使用 TOTP 认证器和一次性恢复码保护密码登录。</div>
          </div>
          <ElTag v-if="mfaStatus.available" :type="mfaStatus.enabled ? 'success' : 'info'" effect="plain">
            {{ mfaStatus.enabled ? '已启用' : '未启用' }}
          </ElTag>
          <ElTag v-else type="warning" effect="plain">未配置</ElTag>
        </div>
      </template>
      <ElAlert
        v-if="!mfaStatus.available"
        type="warning"
        show-icon
        :closable="false"
        title="当前环境尚未配置 MFA 加密密钥，请联系平台管理员。"
      />
      <ElDescriptions v-else :column="2" border>
        <ElDescriptionsItem label="状态">{{ mfaStatus.enabled ? '已启用' : mfaStatus.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="启用时间">{{ formatTime(mfaStatus.enabled_at || '') }}</ElDescriptionsItem>
        <ElDescriptionsItem label="剩余恢复码">{{ mfaStatus.recovery_codes_remaining }}</ElDescriptionsItem>
        <ElDescriptionsItem label="版本">{{ mfaStatus.version || '-' }}</ElDescriptionsItem>
      </ElDescriptions>
      <div v-if="mfaStatus.available" class="mt-16px">
        <ElButton v-if="!mfaStatus.enabled" type="primary" @click="openMFASetup">启用 MFA</ElButton>
        <template v-else>
          <ElButton @click="openMFARecoveryRotation">重新生成恢复码</ElButton>
          <ElButton type="danger" plain @click="openMFADisable">停用 MFA</ElButton>
        </template>
      </div>
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
        <ElTableColumn label="客户端 IP" min-width="150">
          <template #default="{ row }">{{ row.client_ip || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn label="客户端" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.user_agent || '-' }}</template>
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

  <ElDialog v-model="mfaSetupVisible" title="启用多因素认证" width="620px" :close-on-click-modal="false">
    <template v-if="!mfaSetup">
      <ElAlert class="mb-16px" type="info" show-icon :closable="false" title="请先验证当前密码。" />
      <ElInput
        v-model="mfaCurrentPassword"
        type="password"
        show-password
        autocomplete="current-password"
        placeholder="当前密码"
      />
    </template>
    <template v-else>
      <ElAlert
        class="mb-16px"
        type="warning"
        show-icon
        :closable="false"
        title="在认证器中手动输入密钥或导入 URI，然后输入生成的 6 位验证码。密钥仅本次显示。"
      />
      <ElDescriptions :column="1" border class="mb-16px">
        <ElDescriptionsItem label="密钥"><BizCopyText :value="mfaSetup.secret" /></ElDescriptionsItem>
        <ElDescriptionsItem label="配置 URI"><BizCopyText :value="mfaSetup.uri" /></ElDescriptionsItem>
        <ElDescriptionsItem label="有效期">{{ formatTime(mfaSetup.expires_at) }}</ElDescriptionsItem>
      </ElDescriptions>
      <ElInput v-model="mfaConfirmCode" maxlength="6" autocomplete="one-time-code" placeholder="6 位动态验证码" />
    </template>
    <template #footer>
      <ElButton @click="mfaSetupVisible = false">取消</ElButton>
      <ElButton v-if="!mfaSetup" type="primary" :loading="mfaSubmitting" @click="startMFASetup">验证密码</ElButton>
      <ElButton v-else type="primary" :loading="mfaSubmitting" @click="confirmMFASetup">确认启用</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="recoveryCodesVisible" title="保存恢复码" width="620px" :close-on-click-modal="false">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="每个恢复码只能使用一次，关闭后无法再次查看。请立即保存到密码管理器。"
    />
    <div class="grid grid-cols-2 gap-8px rounded bg-#f5f7fa p-16px font-mono">
      <span v-for="code in recoveryCodes" :key="code">{{ code }}</span>
    </div>
    <template #footer>
      <ElButton @click="copyRecoveryCodes">复制全部</ElButton>
      <ElButton type="primary" @click="recoveryCodesVisible = false">我已安全保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="mfaDisableVisible" title="停用多因素认证" width="560px">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="停用后恢复码将全部失效，并退出其他活跃会话。"
    />
    <ElSpace direction="vertical" fill class="w-full">
      <ElInput
        v-model="mfaDisablePassword"
        type="password"
        show-password
        autocomplete="current-password"
        placeholder="当前密码"
      />
      <ElInput v-model="mfaDisableCode" maxlength="6" autocomplete="one-time-code" placeholder="6 位动态验证码" />
    </ElSpace>
    <template #footer>
      <ElButton @click="mfaDisableVisible = false">取消</ElButton>
      <ElButton type="danger" :loading="mfaSubmitting" @click="disableMFA">确认停用</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="mfaRecoveryVisible" title="重新生成恢复码" width="560px">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="生成成功后所有旧恢复码立即失效，新恢复码关闭后无法再次查看。"
    />
    <ElSpace direction="vertical" fill class="w-full">
      <ElInput
        v-model="mfaRecoveryPassword"
        type="password"
        show-password
        autocomplete="current-password"
        placeholder="当前密码"
      />
      <ElInput v-model="mfaRecoveryCode" maxlength="6" autocomplete="one-time-code" placeholder="6 位动态验证码" />
    </ElSpace>
    <template #footer>
      <ElButton @click="mfaRecoveryVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="mfaSubmitting" @click="regenerateMFARecoveryCodes">确认重新生成</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped></style>
