<script setup lang="ts">
import { ref } from 'vue';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import { passwordPolicyError } from '@/platform/password-policy';
import type { UserForm, UserIdentity } from '../../api';
import { createUser, getUserMFAStatus, listUsers, resetUserMFA, updateUserStatus } from '../../api';

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
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
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
      <ElButton link type="danger" :loading="resettingMFAUserID === row.id" @click="resetMFA(row)">重置 MFA</ElButton>
    </template>
  </BizCrudPage>
</template>
