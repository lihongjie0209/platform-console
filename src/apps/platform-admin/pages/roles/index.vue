<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import type { Role, RoleForm } from '../../api';
import { createRole, listRoles, updateRole } from '../../api';

defineOptions({ name: 'PlatformAdminRoles' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
}
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const emptyForm = (): RoleForm => ({
  code: '',
  name: '',
  description: '',
  data_scope: 'none',
  status: 'active',
  version: 0
});
const scopes = ['none', 'self', 'organization', 'tenant', 'all'].map(value => ({ label: value, value }));
const config: BizCrudConfig<Role, Query, RoleForm, string> = {
  title: '角色管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20 }),
  columns: () => [
    { prop: 'code', label: '角色编码', minWidth: 160 },
    { prop: 'name', label: '角色名称', minWidth: 160 },
    {
      prop: 'description',
      label: '描述',
      minWidth: 220,
      showOverflowTooltip: true
    },
    { prop: 'data_scope', label: '数据范围', width: 130 },
    { prop: 'status', label: '状态', width: 110, slot: 'status' },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 520,
    createModel: emptyForm,
    createTitle: '创建角色',
    editTitle: '编辑角色',
    fields: [
      {
        key: 'code',
        label: '角色编码',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入角色编码' }]
      },
      {
        key: 'name',
        label: '角色名称',
        rules: [{ required: true, message: '请输入角色名称' }]
      },
      {
        key: 'description',
        label: '描述',
        type: 'textarea',
        props: { rows: 3 }
      },
      {
        key: 'data_scope',
        label: '数据范围',
        type: 'select',
        options: scopes,
        rules: [{ required: true, message: '请选择数据范围' }]
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
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<Role, Query, RoleForm, string> = {
  async list(query) {
    const result = await listRoles(tenantID.value, query.current, query.size);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.page_size
    };
  },
  create: form => createRole(tenantID.value, form),
  update: updateRole
};
</script>

<template>
  <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
  <BizCrudPage v-else :key="tenantID" :config="config" :adapter="adapter">
    <template #cell-status="{ row }">
      <BizStatusTag :label="String(row.status)" :type="row.status === 'active' ? 'success' : 'danger'" />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
