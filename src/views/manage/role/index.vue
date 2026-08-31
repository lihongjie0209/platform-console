<script setup lang="ts">
import { computed } from 'vue';
import { useBoolean } from '@sa/hooks';
import { enableStatusOptions } from '@/constants/business';
import { fetchGetRoleList } from '@/service/api';
import { useFormRules } from '@/hooks/common/form';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business/crud';
import { BizDictTag } from '@/components/business/common';
import { BizCrudPage, BizRowActions } from '@/components/business/crud';
import { $t } from '@/locales';
import ButtonAuthModal from './modules/button-auth-modal.vue';
import MenuAuthModal from './modules/menu-auth-modal.vue';

defineOptions({ name: 'RoleManage' });

type Row = Api.SystemManage.Role;
type Query = Api.SystemManage.RoleSearchParams;
type Form = Pick<Row, 'roleName' | 'roleCode' | 'roleDesc' | 'status'>;

const { defaultRequiredRule } = useFormRules();
const { bool: menuAuthVisible, setTrue: openMenuAuthModal } = useBoolean();
const { bool: buttonAuthVisible, setTrue: openButtonAuthModal } = useBoolean();

function createQuery(): Query {
  return { current: 1, size: 10, status: undefined, roleName: undefined, roleCode: undefined };
}

function createForm(): Form {
  return { roleName: '', roleCode: '', roleDesc: '', status: undefined };
}

const config: BizCrudConfig<Row, Query, Form, number> = {
  title: () => $t('page.manage.role.title'),
  rowKey: 'id',
  createQuery,
  searchFields: [
    {
      key: 'roleName',
      label: () => $t('page.manage.role.roleName'),
      placeholder: () => $t('page.manage.role.form.roleName'),
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'roleCode',
      label: () => $t('page.manage.role.roleCode'),
      placeholder: () => $t('page.manage.role.form.roleCode'),
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'status',
      label: () => $t('page.manage.role.roleStatus'),
      type: 'select',
      placeholder: () => $t('page.manage.role.form.roleStatus'),
      options: computed(() => enableStatusOptions.map(item => ({ label: $t(item.label), value: item.value }))),
      props: { clearable: true },
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    }
  ],
  columns: () => [
    { prop: 'selection', type: 'selection', width: 48 },
    { prop: 'index', type: 'index', label: $t('common.index'), width: 64 },
    { prop: 'roleName', label: $t('page.manage.role.roleName'), minWidth: 120 },
    { prop: 'roleCode', label: $t('page.manage.role.roleCode'), minWidth: 120 },
    { prop: 'roleDesc', label: $t('page.manage.role.roleDesc'), minWidth: 160 },
    { prop: 'status', label: $t('page.manage.role.roleStatus'), width: 100, align: 'center', slot: 'status' },
    { prop: 'operate', label: $t('common.operate'), width: 140, align: 'center', slot: 'actions' }
  ],
  form: {
    mode: 'dialog',
    width: 560,
    createTitle: () => $t('page.manage.role.addRole'),
    editTitle: () => $t('page.manage.role.editRole'),
    createModel: createForm,
    fields: [
      {
        key: 'roleName',
        label: () => $t('page.manage.role.roleName'),
        placeholder: () => $t('page.manage.role.form.roleName'),
        rules: defaultRequiredRule
      },
      {
        key: 'roleCode',
        label: () => $t('page.manage.role.roleCode'),
        placeholder: () => $t('page.manage.role.form.roleCode'),
        rules: defaultRequiredRule
      },
      {
        key: 'status',
        label: () => $t('page.manage.role.roleStatus'),
        type: 'radio',
        rules: defaultRequiredRule,
        options: computed(() => enableStatusOptions.map(item => ({ label: $t(item.label), value: item.value })))
      },
      {
        key: 'roleDesc',
        label: () => $t('page.manage.role.roleDesc'),
        type: 'textarea',
        placeholder: () => $t('page.manage.role.form.roleDesc'),
        props: { rows: 3 }
      }
    ]
  }
};

const adapter: BizCrudAdapter<Row, Query, Form, number> = {
  async list(query) {
    const { data, error } = await fetchGetRoleList(query);
    if (error) throw error;
    return { items: data.records, total: data.total, page: data.current, pageSize: data.size };
  },
  async create() {},
  async update() {},
  async remove() {}
};

const statusDict = computed(() =>
  enableStatusOptions.map(item => ({
    label: $t(item.label),
    value: item.value,
    tagType: item.value === '1' ? ('success' as const) : ('warning' as const)
  }))
);
</script>

<template>
  <BizCrudPage :config="config" :adapter="adapter">
    <template #cell-status="{ row }">
      <BizDictTag :value="row.status" :options="statusDict" />
    </template>
    <template #cell-actions="{ row, edit, remove, canEdit, canDelete }">
      <BizRowActions :can-edit="canEdit" :can-delete="canDelete" @edit="edit(row)" @delete="remove(row)" />
    </template>
    <template #form-extra="{ operateType, editingKey }">
      <ElSpace v-if="operateType === 'edit'" class="mt-4px">
        <ElButton @click="openMenuAuthModal">{{ $t('page.manage.role.menuAuth') }}</ElButton>
        <ElButton @click="openButtonAuthModal">{{ $t('page.manage.role.buttonAuth') }}</ElButton>
      </ElSpace>
      <MenuAuthModal v-model:visible="menuAuthVisible" :role-id="editingKey || -1" />
      <ButtonAuthModal v-model:visible="buttonAuthVisible" :role-id="editingKey || -1" />
    </template>
  </BizCrudPage>
</template>
