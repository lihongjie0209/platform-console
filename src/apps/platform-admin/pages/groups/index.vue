<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { Group, GroupForm } from '../../api';
import { createGroup, listGroups, updateGroup } from '../../api';

defineOptions({ name: 'PlatformAdminGroups' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
}
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const emptyForm = (): GroupForm => ({ code: '', name: '', status: 'active', version: 0 });
const config: BizCrudConfig<Group, Query, GroupForm, string> = {
  title: '成员组管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20 }),
  columns: () => [
    { prop: 'code', label: '成员组编码', minWidth: 180 },
    { prop: 'name', label: '成员组名称', minWidth: 180 },
    { prop: 'status', label: '状态', width: 110, slot: 'status' },
    { prop: 'updated_at', label: '更新时间', minWidth: 180, formatter: formatPlatformTableDateTime },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 500,
    createModel: emptyForm,
    createTitle: '创建成员组',
    editTitle: '编辑成员组',
    fields: [
      {
        key: 'code',
        label: '成员组编码',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入成员组编码' }]
      },
      { key: 'name', label: '成员组名称', rules: [{ required: true, message: '请输入成员组名称' }] },
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
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<Group, Query, GroupForm, string> = {
  async list(query) {
    const result = await listGroups(tenantID.value, query.current, query.size);
    return { items: result.items, total: result.total, page: result.page, pageSize: result.page_size };
  },
  create: form => createGroup(tenantID.value, form),
  update: updateGroup
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
