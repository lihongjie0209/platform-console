<script setup lang="ts">
import { computed, ref } from 'vue';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { fetchGetAllRoles, fetchGetUserList } from '@/service/api';
import { useFormRules } from '@/hooks/common/form';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business/crud';
import { BizDictTag, BizRemoteSelect } from '@/components/business/common';
import { BizCrudPage, BizRowActions } from '@/components/business/crud';
import { $t } from '@/locales';

defineOptions({ name: 'UserManage' });

type Row = Api.SystemManage.User;
type Query = Api.SystemManage.UserSearchParams;
type Form = Pick<Row, 'userName' | 'userGender' | 'nickName' | 'userPhone' | 'userEmail' | 'userRoles' | 'status'>;

const { defaultRequiredRule, patternRules } = useFormRules();
const roleOptions = ref<CommonType.Option<string>[]>([]);

async function loadRoleOptions() {
  const { data, error } = await fetchGetAllRoles();
  if (!error) roleOptions.value = data.map(item => ({ label: item.roleName, value: item.roleCode }));
}

loadRoleOptions();

const genderDict = computed(() =>
  userGenderOptions.map(item => ({
    label: $t(item.label),
    value: item.value,
    tagType: item.value === '1' ? ('primary' as const) : ('danger' as const)
  }))
);
const statusDict = computed(() =>
  enableStatusOptions.map(item => ({
    label: $t(item.label),
    value: item.value,
    tagType: item.value === '1' ? ('success' as const) : ('warning' as const)
  }))
);

async function loadRoles(keyword: string, page: number, pageSize: number) {
  if (!roleOptions.value.length) await loadRoleOptions();
  const matched = roleOptions.value.filter(item => item.label.toLowerCase().includes(keyword.toLowerCase()));
  const start = (page - 1) * pageSize;
  return { items: matched.slice(start, start + pageSize), total: matched.length };
}

async function resolveRoles(values: string[]) {
  if (!roleOptions.value.length) await loadRoleOptions();
  return values.map(value => roleOptions.value.find(item => item.value === value) || { label: value, value });
}

function createQuery(): Query {
  return {
    current: 1,
    size: 30,
    status: undefined,
    userName: undefined,
    userGender: undefined,
    nickName: undefined,
    userPhone: undefined,
    userEmail: undefined
  };
}

function createForm(): Form {
  return {
    userName: '',
    userGender: undefined,
    nickName: '',
    userPhone: '',
    userEmail: '',
    userRoles: [],
    status: undefined
  };
}

const config: BizCrudConfig<Row, Query, Form, number> = {
  title: () => $t('page.manage.user.title'),
  rowKey: 'id',
  createQuery,
  showSelection: true,
  searchFields: [
    {
      key: 'userName',
      label: () => $t('page.manage.user.userName'),
      placeholder: () => $t('page.manage.user.form.userName'),
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'userGender',
      label: () => $t('page.manage.user.userGender'),
      type: 'select',
      placeholder: () => $t('page.manage.user.form.userGender'),
      options: computed(() => userGenderOptions.map(item => ({ label: $t(item.label), value: item.value }))),
      props: { clearable: true },
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'nickName',
      label: () => $t('page.manage.user.nickName'),
      placeholder: () => $t('page.manage.user.form.nickName'),
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'userPhone',
      label: () => $t('page.manage.user.userPhone'),
      placeholder: () => $t('page.manage.user.form.userPhone'),
      rules: patternRules.phone,
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'userEmail',
      label: () => $t('page.manage.user.userEmail'),
      placeholder: () => $t('page.manage.user.form.userEmail'),
      rules: patternRules.email,
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    },
    {
      key: 'status',
      label: () => $t('page.manage.user.userStatus'),
      type: 'select',
      placeholder: () => $t('page.manage.user.form.userStatus'),
      options: computed(() => enableStatusOptions.map(item => ({ label: $t(item.label), value: item.value }))),
      props: { clearable: true },
      grid: { xs: 24, sm: 12, md: 8, lg: 6 }
    }
  ],
  columns: () => [
    { prop: 'selection', type: 'selection', width: 48 },
    { prop: 'index', type: 'index', label: $t('common.index'), width: 64 },
    { prop: 'userName', label: $t('page.manage.user.userName'), minWidth: 110 },
    { prop: 'userGender', label: $t('page.manage.user.userGender'), width: 100, slot: 'gender' },
    { prop: 'nickName', label: $t('page.manage.user.nickName'), minWidth: 110 },
    { prop: 'userPhone', label: $t('page.manage.user.userPhone'), width: 130 },
    { prop: 'userEmail', label: $t('page.manage.user.userEmail'), minWidth: 200 },
    { prop: 'status', label: $t('page.manage.user.userStatus'), width: 100, align: 'center', slot: 'status' },
    { prop: 'operate', label: $t('common.operate'), width: 140, align: 'center', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 420,
    createTitle: () => $t('page.manage.user.addUser'),
    editTitle: () => $t('page.manage.user.editUser'),
    createModel: createForm,
    fields: [
      {
        key: 'userName',
        label: () => $t('page.manage.user.userName'),
        placeholder: () => $t('page.manage.user.form.userName'),
        rules: defaultRequiredRule
      },
      {
        key: 'userGender',
        label: () => $t('page.manage.user.userGender'),
        type: 'radio',
        options: computed(() => userGenderOptions.map(item => ({ label: $t(item.label), value: item.value })))
      },
      {
        key: 'nickName',
        label: () => $t('page.manage.user.nickName'),
        placeholder: () => $t('page.manage.user.form.nickName')
      },
      {
        key: 'userPhone',
        label: () => $t('page.manage.user.userPhone'),
        placeholder: () => $t('page.manage.user.form.userPhone'),
        rules: patternRules.phone
      },
      {
        key: 'userEmail',
        label: () => $t('page.manage.user.userEmail'),
        placeholder: () => $t('page.manage.user.form.userEmail'),
        rules: patternRules.email
      },
      {
        key: 'status',
        label: () => $t('page.manage.user.userStatus'),
        type: 'radio',
        rules: defaultRequiredRule,
        options: computed(() => enableStatusOptions.map(item => ({ label: $t(item.label), value: item.value })))
      },
      {
        key: 'userRoles',
        label: () => $t('page.manage.user.userRole'),
        type: 'slot',
        slot: 'roles'
      }
    ]
  }
};

const adapter: BizCrudAdapter<Row, Query, Form, number> = {
  async list(query) {
    const { data, error } = await fetchGetUserList(query);
    if (error) throw error;
    return { items: data.records, total: data.total, page: data.current, pageSize: data.size };
  },
  async create() {},
  async update() {},
  async remove() {}
};
</script>

<template>
  <BizCrudPage :config="config" :adapter="adapter">
    <template #cell-gender="{ row }">
      <BizDictTag :value="row.userGender" :options="genderDict" />
    </template>
    <template #cell-status="{ row }">
      <BizDictTag :value="row.status" :options="statusDict" />
    </template>
    <template #field-roles="{ model }">
      <BizRemoteSelect
        v-model="model.userRoles"
        multiple
        :loader="loadRoles"
        :resolver="resolveRoles"
        :placeholder="$t('page.manage.user.form.userRole')"
      />
    </template>
    <template #cell-actions="{ row, edit, remove, canEdit, canDelete }">
      <BizRowActions :can-edit="canEdit" :can-delete="canDelete" @edit="edit(row)" @delete="remove(row)" />
    </template>
  </BizCrudPage>
</template>
