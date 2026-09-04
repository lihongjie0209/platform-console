<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import {
  type AuthorizationManagementScope,
  authorizationManagementContextKey,
  authorizationManagementScopeOptions
} from '@/platform/authorization-management';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import type { Permission, PermissionForm } from '../../api';
import { createMyPermission, getMyPermission, listMyPermissions, updateMyPermission } from '../../api';

defineOptions({ name: 'PlatformAdminPermissions' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
}
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const permissionScope = ref<AuthorizationManagementScope>('tenant');
const emptyForm = (): PermissionForm => ({
  code: '',
  name: '',
  resource_type: '',
  action: '',
  condition_expression: '',
  status: 'active',
  version: 0
});
const config: BizCrudConfig<Permission, Query, PermissionForm, string> = {
  title: '权限管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20 }),
  columns: () => [
    { prop: 'code', label: '权限编码', minWidth: 180 },
    { prop: 'name', label: '权限名称', minWidth: 160 },
    { prop: 'resource_type', label: '资源类型', minWidth: 150 },
    { prop: 'action', label: '操作', width: 120 },
    {
      prop: 'condition_expression',
      label: 'ABAC 条件',
      minWidth: 220,
      showOverflowTooltip: true
    },
    { prop: 'status', label: '状态', width: 100, slot: 'status' },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 560,
    createModel: emptyForm,
    createTitle: '创建权限',
    editTitle: '编辑权限',
    fields: [
      {
        key: 'code',
        label: '权限编码',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入权限编码' }]
      },
      {
        key: 'name',
        label: '权限名称',
        rules: [{ required: true, message: '请输入权限名称' }]
      },
      {
        key: 'resource_type',
        label: '资源类型',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入资源类型' }]
      },
      {
        key: 'action',
        label: '操作',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入操作' }]
      },
      {
        key: 'condition_expression',
        label: 'ABAC 条件表达式',
        type: 'textarea',
        props: { rows: 5 },
        placeholder: '例如 attributes["department"] == "finance"'
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' }
        ]
      }
    ]
  },
  permissions: {
    create: () => ({ scope: permissionScope.value, codes: 'authorization.permission.create' }),
    update: () => ({
      scope: permissionScope.value,
      codes: ['authorization.permission.read', 'authorization.permission.update'],
      strategy: 'all'
    })
  },
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<Permission, Query, PermissionForm, string> = {
  async list(query) {
    const result = await listMyPermissions({
      tenantID: tenantID.value,
      permissionScope: permissionScope.value,
      page: query.current,
      pageSize: query.size
    });
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.page_size
    };
  },
  detail: async permissionID => ({
    ...emptyForm(),
    ...(await getMyPermission({ tenantID: tenantID.value, permissionScope: permissionScope.value, permissionID }))
  }),
  create: (form, context) =>
    createMyPermission(
      { tenantID: tenantID.value, permissionScope: permissionScope.value, form },
      context.idempotencyKey
    ),
  update: (permissionID, form, context) =>
    updateMyPermission(
      { tenantID: tenantID.value, permissionScope: permissionScope.value, permissionID, form },
      context.idempotencyKey
    )
};
</script>

<template>
  <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
  <BizCrudPage
    v-else
    :key="authorizationManagementContextKey(tenantID, permissionScope)"
    :config="config"
    :adapter="adapter"
  >
    <template #toolbar-prefix>
      <ElSegmented v-model="permissionScope" :options="authorizationManagementScopeOptions" />
    </template>
    <template #cell-status="{ row }">
      <BizStatusTag :label="String(row.status)" :type="row.status === 'active' ? 'success' : 'danger'" />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
