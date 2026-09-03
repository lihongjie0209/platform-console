<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCrudPage, BizRowActions } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig } from '@/components/business';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import type { Quota, QuotaForm } from '../../api';
import { getQuota, listQuotas, setQuota } from '../../api';

defineOptions({ name: 'PlatformAdminQuotas' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
  keyword: string;
}
const platformStore = usePlatformStore();
const tenantID = computed(() => platformStore.selectedTenantId);
const emptyForm = (): QuotaForm => ({ key: '', limit: 0, version: 0 });
const config: BizCrudConfig<Quota, Query, QuotaForm, string> = {
  title: '租户配额',
  rowKey: 'key',
  createQuery: () => ({ current: 1, size: 20, keyword: '' }),
  searchFields: [{ key: 'keyword', label: '配额键', placeholder: '例如 users、storage_bytes' }],
  columns: () => [
    { prop: 'key', label: '配额键', minWidth: 190 },
    { prop: 'limit', label: '上限', minWidth: 140 },
    { prop: 'used', label: '已使用', minWidth: 140 },
    { prop: 'used', label: '使用情况', minWidth: 230, slot: 'usage' },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'updated_at', label: '更新时间', minWidth: 180, formatter: formatPlatformTableDateTime },
    { prop: 'key', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 500,
    createModel: emptyForm,
    createTitle: '创建配额',
    editTitle: '调整配额',
    fields: [
      {
        key: 'key',
        label: '配额键',
        disabled: model => Number(model.version) > 0,
        placeholder: '小写字母、数字、点、横线或下划线',
        rules: [{ required: true, pattern: /^[a-z0-9][a-z0-9._-]*$/, message: '请输入有效配额键' }]
      },
      {
        key: 'limit',
        label: '配额上限',
        type: 'number',
        props: { min: 0, step: 1, precision: 0 },
        rules: [{ required: true, type: 'integer', min: 0, message: '请输入不小于 0 的整数' }]
      }
    ]
  },
  permissions: {
    create: { scope: 'tenant', codes: 'tenant.quota.update' },
    update: { scope: 'tenant', codes: ['tenant.quota.read', 'tenant.quota.update'], strategy: 'all' }
  },
  mapRowToForm: row => ({ key: String(row.key), limit: Number(row.limit), version: Number(row.version) })
};
const adapter: BizCrudAdapter<Quota, Query, QuotaForm, string> = {
  async list(query) {
    const result = await listQuotas({
      tenantID: tenantID.value,
      keyword: query.keyword,
      page: query.current,
      pageSize: query.size
    });
    return { items: result.quotas, total: result.total, page: result.page, pageSize: result.page_size };
  },
  detail: async key => {
    const quota = await getQuota(tenantID.value, key);
    return { key: String(quota.key), limit: Number(quota.limit), version: Number(quota.version) };
  },
  create: form => setQuota(tenantID.value, form),
  update: (_key, form) => setQuota(tenantID.value, form)
};
function percentage(row: Quota) {
  const limit = Number(row.limit || 0);
  const used = Number(row.used || 0);
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
function progressStatus(row: Quota) {
  const limit = Number(row.limit || 0);
  const used = Number(row.used || 0);
  if (used >= limit) return 'exception';
  if (limit > 0 && used / limit >= 0.8) return 'warning';
  return 'success';
}
</script>

<template>
  <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
  <BizCrudPage v-else :key="tenantID" :config="config" :adapter="adapter">
    <template #cell-usage="{ row }">
      <ElProgress
        :percentage="percentage(row)"
        :status="progressStatus(row)"
        :format="() => `${row.used || 0} / ${row.limit || 0}`"
      />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
