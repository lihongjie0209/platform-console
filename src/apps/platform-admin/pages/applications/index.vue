<script setup lang="ts">
import type { FormItemRule } from 'element-plus';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import type { Application, ApplicationForm } from '../../api';
import { createApplication, getApplication, listApplications, updateApplication } from '../../api';
import { applicationCodeError, parseJSONObject } from '../../metadata';

defineOptions({ name: 'PlatformAdminApplications' });

interface ApplicationQuery extends Record<string, unknown> {
  current: number;
  size: number;
  status: string;
}

function emptyForm(): ApplicationForm {
  return {
    code: '',
    name: '',
    description: '',
    icon: '',
    default_route: '',
    sort_order: 0,
    status: 'draft',
    metadata_json: '{}',
    version: 0
  };
}

const metadataRule: FormItemRule = {
  validator: (_rule, value, callback) => {
    try {
      parseJSONObject(String(value || ''));
      callback();
    } catch {
      callback(new Error('请输入有效的 JSON 对象'));
    }
  },
  trigger: 'blur'
};

const applicationCodeRule: FormItemRule = {
  validator: (_rule, value, callback) => {
    const message = applicationCodeError(value);
    if (message) callback(new Error(message));
    else callback();
  },
  trigger: 'blur'
};

const config: BizCrudConfig<Application, ApplicationQuery, ApplicationForm, string> = {
  title: '应用管理',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20, status: '' }),
  searchFields: [
    {
      key: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '草稿', value: 'draft' },
        { label: '启用', value: 'active' },
        { label: '停用', value: 'disabled' },
        { label: '归档', value: 'archived' }
      ]
    }
  ],
  columns: () => [
    { prop: 'code', label: '应用编码', minWidth: 150 },
    { prop: 'name', label: '应用名称', minWidth: 150 },
    { prop: 'description', label: '描述', minWidth: 200, showOverflowTooltip: true },
    { prop: 'default_route', label: '默认路由', minWidth: 160 },
    { prop: 'published_release', label: '已发布版本', width: 125 },
    { prop: 'status', label: '状态', width: 100, slot: 'status' },
    { prop: 'version', label: '数据版本', width: 100 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 560,
    createModel: emptyForm,
    createTitle: '创建应用',
    editTitle: '编辑应用',
    fields: [
      {
        key: 'code',
        label: '应用编码',
        disabled: model => Number(model.version) > 0,
        rules: [{ required: true, message: '请输入应用编码' }, applicationCodeRule]
      },
      { key: 'name', label: '应用名称', rules: [{ required: true, message: '请输入应用名称' }] },
      { key: 'description', label: '描述', type: 'textarea', props: { rows: 3 } },
      { key: 'icon', label: 'Iconify 图标' },
      { key: 'default_route', label: '默认路由', placeholder: '例如 applications' },
      { key: 'sort_order', label: '排序', type: 'number', props: { min: 0 } },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
          { label: '归档', value: 'archived' }
        ]
      },
      {
        key: 'metadata_json',
        label: '扩展元数据 JSON',
        type: 'textarea',
        props: { rows: 5 },
        rules: [metadataRule]
      }
    ]
  },
  mapRowToForm: row => ({
    ...emptyForm(),
    ...row,
    metadata_json: typeof row.metadata_json === 'string' ? row.metadata_json : JSON.stringify(row.metadata_json || {})
  })
};

const adapter: BizCrudAdapter<Application, ApplicationQuery, ApplicationForm, string> = {
  async list(query) {
    const result = await listApplications(query.current, query.size, query.status);
    return { items: result.items, total: result.total, page: result.page, pageSize: result.page_size };
  },
  async detail(id) {
    const row = await getApplication(id);
    return config.mapRowToForm?.(row) || row;
  },
  create: createApplication,
  update: updateApplication
};

function statusType(status?: string) {
  if (status === 'active') return 'success';
  if (status === 'disabled' || status === 'archived') return 'danger';
  return 'info';
}
</script>

<template>
  <BizCrudPage :config="config" :adapter="adapter">
    <template #cell-status="{ row }">
      <BizStatusTag :label="String(row.status || '-')" :type="statusType(row.status)" />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
