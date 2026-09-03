<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { BizCrudPage, BizRowActions, BizStatusTag } from '@/components/business';
import type { BizCrudAdapter, BizCrudConfig, BizFieldOption } from '@/components/business';
import { createLatestRequestGuard } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { remoteSearchPage } from '@/platform/remote-search';
import type { Membership, MembershipForm, OrganizationUnit, UserIdentity } from '../../api';
import {
  addMembership,
  batchGetOrganizationUnits,
  batchGetUsers,
  listMemberships,
  listUsers,
  treeOrganizationUnits,
  updateMembership
} from '../../api';
import { flattenOrganizationTree, mergeOrganizationDirectory } from '../../organization-directory';
import { boundedDistinctIDs, mergeUserDirectory } from '../../user-directory';

defineOptions({ name: 'PlatformAdminMemberships' });
interface Query extends Record<string, unknown> {
  current: number;
  size: number;
  user_id: string;
  status: string;
}
const platformStore = usePlatformStore();
const users = ref<UserIdentity[]>([]);
const userSearchGuard = createLatestRequestGuard();
const organizationSearchGuard = createLatestRequestGuard();
const organizations = ref<OrganizationUnit[]>([]);
const userOptions = computed<BizFieldOption[]>(() =>
  users.value.map(item => ({ label: `${item.display_name || item.username} (${item.username})`, value: item.id }))
);
const organizationOptions = computed<BizFieldOption[]>(() =>
  organizations.value
    .filter(item => item.status === 'active')
    .map(item => ({ label: `${item.name} (${item.code})`, value: item.id }))
);
const userByID = computed(() => new Map(users.value.map(item => [item.id, item])));
const organizationByID = computed(() => new Map(organizations.value.map(item => [item.id, item])));
const tenantID = computed(() => platformStore.selectedTenantId);
const editing = (model: Record<string, unknown>) => Number(model.version) > 0;
const emptyForm = (): MembershipForm => ({
  user_id: '',
  primary_organization_unit_id: '',
  status: 'active',
  reason: '',
  version: 0
});
const statuses = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
  { label: '移除', value: 'removed' }
];
const statusFilters = [{ label: '全部', value: '' }, { label: '待接受', value: 'invited' }, ...statuses];
const config: BizCrudConfig<Membership, Query, MembershipForm, string> = {
  title: '租户成员',
  rowKey: 'id',
  createQuery: () => ({ current: 1, size: 20, user_id: '', status: '' }),
  searchFields: [
    {
      key: 'user_id',
      label: '用户',
      type: 'select',
      options: userOptions,
      props: { filterable: true, clearable: true, remote: true, remoteMethod: searchUsers }
    },
    { key: 'status', label: '状态', type: 'select', options: statusFilters }
  ],
  columns: () => [
    { prop: 'user_id', label: '用户', minWidth: 210, slot: 'user' },
    { prop: 'primary_organization_unit_id', label: '主组织', minWidth: 190, slot: 'organization' },
    { prop: 'status', label: '状态', width: 110, slot: 'status' },
    { prop: 'joined_at', label: '加入时间', minWidth: 180, formatter: formatPlatformTableDateTime },
    { prop: 'version', label: '版本', width: 90 },
    { prop: 'id', label: '操作', width: 100, fixed: 'right', slot: 'actions' }
  ],
  form: {
    mode: 'drawer',
    width: 540,
    createModel: emptyForm,
    createTitle: '添加租户成员',
    editTitle: '编辑租户成员',
    fields: [
      {
        key: 'user_id',
        label: '用户',
        type: 'select',
        options: userOptions,
        disabled: editing,
        props: { filterable: true, remote: true, remoteMethod: searchUsers },
        rules: [{ required: true, message: '请选择用户' }]
      },
      {
        key: 'primary_organization_unit_id',
        label: '主组织',
        type: 'select',
        options: organizationOptions,
        props: { filterable: true, clearable: true, remote: true, remoteMethod: searchOrganizations }
      },
      {
        key: 'status',
        label: '状态',
        type: 'select',
        options: statuses,
        visible: editing,
        rules: [{ required: true, message: '请选择状态' }]
      },
      {
        key: 'reason',
        label: '变更原因',
        type: 'textarea',
        visible: editing,
        props: { rows: 3 },
        rules: [{ required: true, message: '请输入变更原因' }]
      }
    ]
  },
  permissions: {
    create: { scope: 'tenant', codes: 'tenant.membership.create' },
    update: { scope: 'tenant', codes: 'tenant.membership.update' }
  },
  mapRowToForm: row => ({ ...emptyForm(), ...row })
};
const adapter: BizCrudAdapter<Membership, Query, MembershipForm, string> = {
  async list(query) {
    const result = await listMemberships({
      tenantID: tenantID.value,
      userID: query.user_id,
      status: query.status,
      page: query.current,
      pageSize: query.size
    });
    const ids = boundedDistinctIDs(result.memberships.map(item => item.user_id));
    const organizationIDs = boundedDistinctIDs(
      result.memberships.map(item => item.primary_organization_unit_id).filter(Boolean)
    );
    const [directory, organizationDirectory] = await Promise.all([
      ids.length ? batchGetUsers(ids) : Promise.resolve({ items: [] as UserIdentity[] }),
      organizationIDs.length
        ? batchGetOrganizationUnits(tenantID.value, organizationIDs)
        : Promise.resolve({ items: [] as OrganizationUnit[] })
    ]);
    users.value = mergeUserDirectory(users.value, directory.items || []);
    organizations.value = mergeOrganizationDirectory(organizations.value, organizationDirectory.items || []);
    return { items: result.memberships, total: result.total, page: result.page, pageSize: result.page_size };
  },
  create: form => addMembership(tenantID.value, form),
  update: updateMembership
};
function userLabel(id: string) {
  const user = userByID.value.get(id);
  return user ? `${user.display_name || user.username} (${user.username})` : id;
}
function organizationLabel(id: string) {
  if (!id) return '-';
  const organization = organizationByID.value.get(id);
  return organization ? `${organization.name} (${organization.code})` : id;
}
async function searchUsers(keyword: string) {
  const request = userSearchGuard.begin();
  const result = await listUsers({ ...remoteSearchPage(), keyword: keyword.trim(), status: 'active' });
  if (userSearchGuard.isCurrent(request)) users.value = mergeUserDirectory(users.value, result.items);
}
async function searchOrganizations(keyword: string) {
  if (!tenantID.value) return;
  const request = organizationSearchGuard.begin();
  const result = await treeOrganizationUnits({
    tenantID: tenantID.value,
    mode: 'search_with_ancestors',
    keyword: keyword.trim(),
    status: 'active',
    maxDepth: 32,
    maxNodes: 50
  });
  if (organizationSearchGuard.isCurrent(request)) {
    organizations.value = mergeOrganizationDirectory(organizations.value, flattenOrganizationTree(result.nodes || []));
  }
}
watch(tenantID, () => {
  organizationSearchGuard.invalidate();
  organizations.value = [];
  searchOrganizations('');
});
onMounted(() => Promise.all([searchUsers(''), searchOrganizations('')]));
</script>

<template>
  <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
  <BizCrudPage v-else :key="tenantID" :config="config" :adapter="adapter">
    <template #cell-user="{ row }">{{ userLabel(String(row.user_id)) }}</template>
    <template #cell-organization="{ row }">
      {{ organizationLabel(String(row.primary_organization_unit_id || '')) }}
    </template>
    <template #cell-status="{ row }">
      <BizStatusTag
        :label="String(row.status)"
        :type="row.status === 'active' ? 'success' : row.status === 'removed' ? 'danger' : 'warning'"
      />
    </template>
    <template #cell-actions="{ row, edit, canEdit }">
      <BizRowActions :can-edit="canEdit" :can-delete="false" @edit="edit(row)" />
    </template>
  </BizCrudPage>
</template>
