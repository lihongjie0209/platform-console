<script setup lang="ts">
import { computed, ref } from 'vue';
import { BizCopyText, BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import { formatPlatformDateTime } from '@/platform/date-time';
import { passwordPolicyError } from '@/platform/password-policy';
import { buildPasswordResetURL } from '@/platform/password-reset';
import type { UserForm, UserIdentity } from '../../api';
import {
  createUser,
  getUserMFAStatus,
  issueUserPasswordReset,
  listUsers,
  resetUserMFA,
  updateUserStatus
} from '../../api';

defineOptions({ name: 'PlatformAdminUsers' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
  keyword: string;
  status: string;
}
const emptyForm = (): UserForm => ({
  username: '',
  display_name: '',
  email: '',
  phone: '',
  password: '',
  status: 'active',
  reason: '',
  version: 0
});
const editing = (model: Record<string, unknown>) => Number(model.version) > 0;
const config: BizCrudConfig<UserIdentity, Query, UserForm, string> = {
  title: '用户管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20, keyword: '', status: '' }),
  searchFields: [
    { key: 'keyword', label: '关键词', placeholder: '用户名、姓名、邮箱或手机' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '启用', value: 'active' },
        { label: '停用', value: 'disabled' },
        { label: '锁定', value: 'locked' },
        { label: '关闭', value: 'closed' }
      ]
    }
  ],
  columns: () => [
    { prop: 'username', label: '用户名', minWidth: 150 },
    { prop: 'display_name', label: '姓名', minWidth: 150 },
    { prop: 'email', label: '邮箱', minWidth: 210 },
    { prop: 'phone', label: '手机', minWidth: 150 },
    { prop: 'status', label: '状态', width: 110, slot: 'status' },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 270, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 540,
    createModel: emptyForm,
    createTitle: '创建用户',
    editTitle: '更新用户状态',
    fields: [
      { key: 'username', label: '用户名', disabled: editing, rules: [{ required: true, message: '请输入用户名' }] },
      { key: 'display_name', label: '姓名', disabled: editing, rules: [{ required: true, message: '请输入姓名' }] },
      {
        key: 'email',
        label: '邮箱',
        disabled: editing,
        rules: [
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效邮箱' }
        ]
      },
      { key: 'phone', label: '手机', disabled: editing },
      {
        key: 'password',
        label: '初始密码',
        visible: model => !editing(model),
        props: { type: 'password', showPassword: true },
        rules: [
          { required: true, message: '请输入初始密码' },
          {
            validator: (_rule, value, callback) => {
              const message = passwordPolicyError(String(value || ''));
              if (message) callback(new Error(message));
              else callback();
            },
            trigger: ['blur', 'change']
          }
        ]
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        visible: editing,
        options: [
          { label: '启用', value: 'active' },
          { label: '停用（退出全部会话）', value: 'disabled' },
          { label: '锁定（退出全部会话）', value: 'locked' },
          { label: '关闭（退出全部会话）', value: 'closed' }
        ]
      },
      {
        key: 'reason',
        label: '变更原因',
        type: 'textarea',
        visible: editing,
        props: { rows: 3 },
        rules: [{ required: true, message: '请输入状态变更原因' }]
      }
    ]
  },
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<UserIdentity, Query, UserForm, string> = {
  async list(query) {
    const result = await listUsers({
      page: query.current,
      pageSize: query.size,
      keyword: query.keyword,
      status: query.status
    });
    return { items: result.items, total: result.total, page: result.page, pageSize: result.page_size };
  },
  create: createUser,
  update: updateUserStatus
};

const resettingMFAUserID = ref('');
const passwordResetUserID = ref('');
const passwordResetToken = ref('');
const passwordResetExpiresAt = ref('');
const passwordResetVisible = ref(false);

const passwordResetURL = computed(() => {
  if (!passwordResetToken.value) return '';
  return buildPasswordResetURL(window.location.origin, passwordResetToken.value);
});

function closePasswordResetIssue() {
  passwordResetVisible.value = false;
  passwordResetToken.value = '';
  passwordResetExpiresAt.value = '';
}

async function issuePasswordReset(row: UserIdentity) {
  passwordResetUserID.value = row.id;
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `请确认已通过线下渠道核验 ${row.username} 的身份，并填写签发原因。`,
      '签发一次性密码重置令牌',
      {
        type: 'warning',
        confirmButtonText: '确认签发',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValidator: input => Boolean(input?.trim()) || '请输入签发原因'
      }
    );
    const issue = await issueUserPasswordReset(row.id, reason.trim());
    passwordResetToken.value = issue.reset_token;
    passwordResetExpiresAt.value = issue.expires_at;
    passwordResetVisible.value = true;
  } catch {
    // The request layer reports service failures; prompt cancellation needs no extra notice.
  } finally {
    passwordResetUserID.value = '';
  }
}

async function resetMFA(row: UserIdentity) {
  resettingMFAUserID.value = row.id;
  try {
    const status = await getUserMFAStatus(row.id);
    if (!status.enabled) {
      window.$message?.info('该用户未启用 MFA，无需重置');
      return;
    }
    const { value: reason } = await ElMessageBox.prompt(
      `重置后，${row.username} 的所有恢复码和登录会话将立即失效。请输入可审计的重置原因。`,
      '高风险操作：重置 MFA',
      {
        type: 'warning',
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：用户已完成线下身份核验并报告设备遗失',
        inputValidator: input => Boolean(input?.trim()) || '请输入重置原因'
      }
    );
    const result = await resetUserMFA(row.id, reason.trim(), status.version);
    window.$message?.success(`MFA 已重置，并撤销 ${result.revoked_sessions} 个活跃会话`);
  } catch {
    // The request layer reports service failures; prompt cancellation needs no extra notice.
  } finally {
    resettingMFAUserID.value = '';
  }
}
</script>

<template>
  <BizCrudPage :config="config" :adapter="adapter">
    <template #cell-status="{ row }">
      <BizStatusTag
        :label="String(row.status)"
        :type="row.status === 'active' ? 'success' : row.status === 'locked' ? 'warning' : 'danger'"
      />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
      <ElButton link :loading="passwordResetUserID === row.id" @click="issuePasswordReset(row)">重置密码</ElButton>
      <ElButton link type="danger" :loading="resettingMFAUserID === row.id" @click="resetMFA(row)">重置 MFA</ElButton>
    </template>
  </BizCrudPage>

  <ElDialog v-model="passwordResetVisible" title="一次性密码重置令牌" width="680px" :close-on-click-modal="false">
    <ElAlert
      class="mb-16px"
      type="warning"
      show-icon
      :closable="false"
      title="令牌和链接仅显示一次，请通过已核验的安全渠道交付给用户。再次签发会立即使本令牌失效。"
    />
    <ElDescriptions :column="1" border>
      <ElDescriptionsItem label="重置令牌"><BizCopyText :value="passwordResetToken" /></ElDescriptionsItem>
      <ElDescriptionsItem label="重置链接"><BizCopyText :value="passwordResetURL" /></ElDescriptionsItem>
      <ElDescriptionsItem label="有效期至">{{ formatPlatformDateTime(passwordResetExpiresAt) }}</ElDescriptionsItem>
    </ElDescriptions>
    <template #footer>
      <ElButton type="primary" @click="closePasswordResetIssue">我已安全交付</ElButton>
    </template>
  </ElDialog>
</template>
