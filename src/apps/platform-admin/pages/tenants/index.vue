<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig, BizFieldOption } from '@/components/business';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { TenantDirectoryItem, TenantForm, UserIdentity } from '../../api';
import { createTenant, getTenant, listTenantDirectory, listUsers, updateTenant } from '../../api';

defineOptions({ name: 'PlatformAdminTenants' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
  keyword: string;
  status: string;
}
const ownerOptions = ref<BizFieldOption[]>([]);
const emptyForm = (): TenantForm => ({ code: '', name: '', owner_user_id: '', status: 'active', version: 0 });
const config: BizCrudConfig<TenantDirectoryItem, Query, TenantForm, string> = {
  title: '租户管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20, keyword: '', status: '' }),
  searchFields: [
    { key: 'keyword', label: '关键词', placeholder: '租户编码或名称' },
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '启用', value: 'active' },
        { label: '停用', value: 'disabled' }
      ]
    }
  ],
  columns: () => [
    { prop: 'code', label: '租户编码', minWidth: 170 },
    { prop: 'name', label: '租户名称', minWidth: 180 },
    { prop: 'status', label: '状态', width: 110, slot: 'status' },
    { prop: 'updated_at', label: '更新时间', minWidth: 180, formatter: formatPlatformTableDateTime },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 520,
    createModel: emptyForm,
    createTitle: '创建租户',
    editTitle: '编辑租户',
    fields: [
      {
        key: 'code',
        label: '租户编码',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入租户编码' }]
      },
      { key: 'name', label: '租户名称', rules: [{ required: true, message: '请输入租户名称' }] },
      {
        key: 'owner_user_id',
        label: '初始管理员',
        type: 'select',
        options: ownerOptions,
        visible: model => Number(model.version) === 0,
        rules: [{ required: true, message: '请选择初始管理员' }],
        props: { filterable: true }
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        visible: model => Number(model.version) > 0,
        options: [
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' }
        ]
      }
    ]
  },
  permissions: {
    create: { scope: 'platform', codes: 'tenant.profile.create' },
    update: { scope: 'platform', codes: ['tenant.profile.read', 'tenant.profile.update'], strategy: 'all' }
  },
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<TenantDirectoryItem, Query, TenantForm, string> = {
  async list(query) {
    const result = await listTenantDirectory({
      page: query.current,
      pageSize: query.size,
      keyword: query.keyword,
      status: query.status
    });
    return { items: result.items, total: result.total, page: result.page, pageSize: result.page_size };
  },
  detail: getTenant,
  create: createTenant,
  update: updateTenant
};
function userLabel(user: UserIdentity) {
  return `${user.display_name || user.username} (${user.username})`;
}
async function loadOwners() {
  const result = await listUsers({ page: 1, pageSize: 100 });
  ownerOptions.value = result.items
    .filter(item => item.status === 'active')
    .map(item => ({ label: userLabel(item), value: item.id }));
}
onMounted(loadOwners);
</script>

<template>
  <BizCrudPage :config="config" :adapter="adapter">
    <template #cell-status="{ row }">
      <BizStatusTag :label="String(row.status)" :type="row.status === 'active' ? 'success' : 'danger'" />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
