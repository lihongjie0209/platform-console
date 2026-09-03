<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { remoteSearchPage } from '@/platform/remote-search';
import { confirmUserAction } from '@/platform/user-action';
import {
  type AuthorizationManagementScope,
  authorizationManagementScopeOptions
} from '@/platform/authorization-management';
import type {
  Binding,
  BindingForm,
  Group,
  Membership,
  OrganizationUnit,
  Role,
  ServiceAccount,
  UserIdentity
} from '../../api';
import {
  batchGetMemberships,
  batchGetMyRoles,
  batchGetOrganizationUnits,
  batchGetServiceAccounts,
  batchGetUsers,
  createMyBinding,
  listGroups,
  listMyBindings,
  listMyRoles,
  listServiceAccounts,
  listUsers,
  revokeMyBinding,
  searchMembershipDirectory,
  treeOrganizationUnits
} from '../../api';
import { flattenOrganizationTree, mergeOrganizationDirectory } from '../../organization-directory';
import { boundedDistinctIDs, mergeUserDirectory } from '../../user-directory';

defineOptions({ name: 'PlatformAdminRoleBindings' });
const platformStore = usePlatformStore();
const loading = ref(false);
const submitting = ref(false);
const subjectSearching = ref(false);
const roleSearching = ref(false);
const organizationSearching = ref(false);
const rows = ref<Binding[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const roles = ref<Role[]>([]);
const memberships = ref<Membership[]>([]);
const groups = ref<Group[]>([]);
const organizations = ref<OrganizationUnit[]>([]);
const users = ref<UserIdentity[]>([]);
const serviceAccounts = ref<ServiceAccount[]>([]);
const organizationGuard = createLatestRequestGuard();
const bindingScope = ref<AuthorizationManagementScope>('tenant');
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<BindingForm>({
  subject_type: 'membership',
  subject_id: '',
  role_id: '',
  organization_unit_id: ''
});
const tenantID = computed(() => platformStore.selectedTenantId);
const canCreateBinding = computed(() =>
  platformStore.hasPermission({ scope: bindingScope.value, codes: 'authorization.binding.create' })
);
const canRevokeBinding = computed(() =>
  platformStore.hasPermission({ scope: bindingScope.value, codes: 'authorization.binding.revoke' })
);
const roleByID = computed(() => new Map(roles.value.map(item => [String(item.id), item])));
const groupByID = computed(() => new Map(groups.value.map(item => [String(item.id), item])));
const membershipByID = computed(() => new Map(memberships.value.map(item => [String(item.id), item])));
const organizationByID = computed(() => new Map(organizations.value.map(item => [String(item.id), item])));
const userByID = computed(() => new Map(users.value.map(item => [String(item.id), item])));
const serviceAccountByID = computed(() => new Map(serviceAccounts.value.map(item => [String(item.id), item])));
const subjectTypeOptions = computed(() =>
  bindingScope.value === 'platform'
    ? [
        { label: '全局用户', value: 'user' },
        { label: '服务账号', value: 'service_account' }
      ]
    : [
        { label: '租户成员', value: 'membership' },
        { label: '成员组', value: 'group' },
        { label: '服务账号', value: 'service_account' }
      ]
);
const subjectOptions = computed(() => {
  if (form.subject_type === 'user')
    return users.value
      .filter(item => item.status === 'active')
      .map(item => ({ value: String(item.id), label: `${item.display_name || item.username} (${item.username})` }));
  if (form.subject_type === 'service_account')
    return serviceAccounts.value
      .filter(item => item.status === 'active')
      .map(item => ({ value: String(item.id), label: `${item.name} (${item.client_id})` }));
  if (form.subject_type === 'group')
    return groups.value
      .filter(item => item.status === 'active')
      .map(item => ({ value: String(item.id), label: `${item.name} (${item.code})` }));
  return memberships.value
    .filter(item => item.status === 'active')
    .map(item => ({ value: String(item.id), label: membershipLabel(String(item.id)) }));
});
const rules: FormRules<BindingForm> = {
  subject_type: [{ required: true, message: '请选择主体类型', trigger: 'change' }],
  subject_id: [{ required: true, message: '请选择或输入主体', trigger: 'change' }],
  role_id: [{ required: true, message: '请选择角色', trigger: 'change' }]
};

function membershipLabel(id: string) {
  const membership = membershipByID.value.get(id);
  const user = membership ? userByID.value.get(String(membership.user_id)) : undefined;
  return user ? `${user.display_name || user.username} (${user.username})` : String(membership?.user_id || id);
}
function subjectLabel(row: Binding) {
  const id = String(row.subject_id);
  if (row.subject_type === 'group') {
    const group = groupByID.value.get(id);
    return group ? `${group.name} (${group.code})` : id;
  }
  if (row.subject_type === 'membership') return membershipLabel(id);
  if (row.subject_type === 'user') {
    const user = userByID.value.get(id);
    return user ? `${user.display_name || user.username} (${user.username})` : id;
  }
  if (row.subject_type === 'service_account') {
    const account = serviceAccountByID.value.get(id);
    return account ? `${account.name} (${account.client_id})` : id;
  }
  return id;
}
function roleLabel(id: unknown) {
  const role = roleByID.value.get(String(id));
  return role ? `${role.name} (${role.code})` : String(id || '-');
}
function organizationLabel(id: unknown) {
  if (!id) return '-';
  const organization = organizationByID.value.get(String(id));
  return organization ? `${organization.name} (${organization.code})` : String(id);
}
async function loadRows() {
  if (!tenantID.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const result = await listMyBindings({
      tenantID: tenantID.value,
      permissionScope: bindingScope.value,
      page: page.value,
      pageSize: pageSize.value
    });
    rows.value = result.items;
    total.value = result.total;
    await hydrateVisibleSubjects(result.items);
  } finally {
    loading.value = false;
  }
}
async function loadCatalogs() {
  if (!tenantID.value) return;
  const result = await listMyRoles({
    tenantID: tenantID.value,
    permissionScope: bindingScope.value,
    ...remoteSearchPage(100),
    status: 'active'
  });
  roles.value = result.items;
  if (bindingScope.value === 'platform') {
    memberships.value = [];
    groups.value = [];
    organizations.value = [];
    return;
  }
  await searchOrganizations();
}
async function hydrateVisibleSubjects(bindings: Binding[]) {
  const currentTenantID = tenantID.value;
  if (!currentTenantID) return;
  const userIDs = boundedDistinctIDs(
    bindings.filter(item => item.subject_type === 'user').map(item => String(item.subject_id))
  );
  const membershipIDs = boundedDistinctIDs(
    bindings.filter(item => item.subject_type === 'membership').map(item => String(item.subject_id))
  );
  const roleIDs = boundedDistinctIDs(bindings.map(item => String(item.role_id)));
  const serviceAccountIDs = boundedDistinctIDs(
    bindings.filter(item => item.subject_type === 'service_account').map(item => String(item.subject_id))
  );
  const organizationIDs = boundedDistinctIDs(
    bindings.map(item => String(item.organization_unit_id || '')).filter(Boolean)
  );
  const [userResult, membershipResult, roleResult, serviceAccountResult, organizationResult] = await Promise.all([
    userIDs.length ? batchGetUsers(userIDs) : Promise.resolve({ items: [] }),
    membershipIDs.length
      ? batchGetMemberships(currentTenantID, membershipIDs)
      : Promise.resolve({ memberships: [] as Membership[] }),
    roleIDs.length
      ? batchGetMyRoles(currentTenantID, bindingScope.value, roleIDs)
      : Promise.resolve({ items: [] as Role[] }),
    serviceAccountIDs.length
      ? batchGetServiceAccounts(serviceAccountIDs)
      : Promise.resolve({ items: [] as ServiceAccount[] }),
    organizationIDs.length
      ? batchGetOrganizationUnits(currentTenantID, organizationIDs)
      : Promise.resolve({ items: [] as OrganizationUnit[] })
  ]);
  roles.value = mergeRoleDirectory(roles.value, roleResult.items);
  serviceAccounts.value = mergeServiceAccountDirectory(serviceAccounts.value, serviceAccountResult.items);
  memberships.value = membershipResult.memberships;
  organizations.value = mergeOrganizationDirectory(organizations.value, organizationResult.items);
  const membershipUserIDs = boundedDistinctIDs(membershipResult.memberships.map(item => String(item.user_id)));
  const membershipUsers = membershipUserIDs.length ? await batchGetUsers(membershipUserIDs) : { items: [] };
  users.value = mergeUserDirectory(users.value, [...userResult.items, ...membershipUsers.items]);
}
async function searchOrganizations(keyword = '') {
  if (!tenantID.value || bindingScope.value !== 'tenant') return;
  const request = organizationGuard.begin();
  organizationSearching.value = true;
  try {
    const result = await treeOrganizationUnits({
      tenantID: tenantID.value,
      mode: 'search_with_ancestors',
      keyword: keyword.trim(),
      status: 'active',
      maxDepth: 32,
      maxNodes: 50
    });
    if (organizationGuard.isCurrent(request)) {
      organizations.value = mergeOrganizationDirectory(
        organizations.value,
        flattenOrganizationTree(result.nodes || [])
      );
    }
  } finally {
    if (organizationGuard.isCurrent(request)) organizationSearching.value = false;
  }
}
function mergeRoleDirectory(current: Role[], incoming: Role[]) {
  const values = new Map(current.map(item => [String(item.id), item]));
  for (const item of incoming) values.set(String(item.id), item);
  return [...values.values()];
}
function mergeServiceAccountDirectory(current: ServiceAccount[], incoming: ServiceAccount[]) {
  const values = new Map(current.map(item => [String(item.id), item]));
  for (const item of incoming) values.set(String(item.id), item);
  return [...values.values()];
}
async function searchRoles(keyword = '') {
  if (!tenantID.value) return;
  roleSearching.value = true;
  try {
    const result = await listMyRoles({
      tenantID: tenantID.value,
      permissionScope: bindingScope.value,
      ...remoteSearchPage(50),
      keyword,
      status: 'active'
    });
    roles.value = mergeRoleDirectory(roles.value, result.items);
  } finally {
    roleSearching.value = false;
  }
}
async function searchSubjects(keyword = '') {
  if (!tenantID.value) return;
  subjectSearching.value = true;
  try {
    if (form.subject_type === 'user') {
      const result = await listUsers({ ...remoteSearchPage(20), keyword, status: 'active' });
      users.value = mergeUserDirectory(users.value, result.items);
      return;
    }
    if (form.subject_type === 'service_account') {
      const result = await listServiceAccounts({ ...remoteSearchPage(20), keyword, status: 'active' });
      serviceAccounts.value = mergeServiceAccountDirectory(serviceAccounts.value, result.items);
      return;
    }
    if (form.subject_type === 'group') {
      const searchPage = remoteSearchPage(50);
      const result = await listGroups({
        tenantID: tenantID.value,
        ...searchPage,
        keyword,
        status: 'active'
      });
      groups.value = result.items;
      return;
    }
    const result = await searchMembershipDirectory(tenantID.value, keyword, 20);
    memberships.value = result.items.map(item => item.membership);
    users.value = mergeUserDirectory(
      users.value,
      result.items.map(item => ({
        ...item.user,
        email: '',
        phone: '',
        version: 0
      }))
    );
  } finally {
    subjectSearching.value = false;
  }
}
async function openCreate() {
  if (!canCreateBinding.value) return;
  Object.assign(form, {
    subject_type: bindingScope.value === 'platform' ? 'user' : 'membership',
    subject_id: '',
    role_id: '',
    organization_unit_id: ''
  });
  formRef.value?.clearValidate();
  dialogVisible.value = true;
  await Promise.all([searchSubjects(), searchRoles(), searchOrganizations()]);
}
async function submit() {
  if (!canCreateBinding.value || !(await formRef.value?.validate())) return;
  submitting.value = true;
  try {
    await createMyBinding({ tenantID: tenantID.value, permissionScope: bindingScope.value, form });
    dialogVisible.value = false;
    window.$message?.success('角色已绑定');
    await loadRows();
  } finally {
    submitting.value = false;
  }
}
async function revoke(row: Binding) {
  if (!canRevokeBinding.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm('撤销后目标主体将立即失去该角色授予的权限，确认继续吗？', '撤销角色绑定', {
      type: 'warning'
    })
  );
  if (!confirmed) return;
  await revokeMyBinding({
    tenantID: tenantID.value,
    permissionScope: bindingScope.value,
    bindingID: String(row.id),
    version: Number(row.version)
  });
  window.$message?.success('角色绑定已撤销');
  await loadRows();
}
function changePage(value: number) {
  page.value = value;
  loadRows();
}
function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  loadRows();
}
watch(
  () => form.subject_type,
  async () => {
    form.subject_id = '';
    await searchSubjects();
  }
);
watch([tenantID, bindingScope], async () => {
  organizationGuard.invalidate();
  page.value = 1;
  rows.value = [];
  form.subject_type = bindingScope.value === 'platform' ? 'user' : 'membership';
  await Promise.all([loadCatalogs(), loadRows()]);
});
onMounted(() => Promise.all([loadCatalogs(), loadRows()]));
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">角色绑定</h2>
          <p class="mb-0 mt-6px text-13px text-#999">租户角色绑定成员或成员组；平台角色绑定全局用户。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSegmented v-model="bindingScope" :options="authorizationManagementScopeOptions" />
          <ElButton :loading="loading" @click="loadRows">刷新</ElButton>
          <ElButton v-if="canCreateBinding" type="primary" :disabled="!tenantID" @click="openCreate">新增绑定</ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElTable v-loading="loading" :data="rows" border stripe>
        <ElTableColumn prop="subject_type" label="主体类型" width="130" />
        <ElTableColumn label="主体" min-width="220">
          <template #default="{ row }">{{ subjectLabel(row) }}</template>
        </ElTableColumn>
        <ElTableColumn label="角色" min-width="190">
          <template #default="{ row }">{{ roleLabel(row.role_id) }}</template>
        </ElTableColumn>
        <ElTableColumn label="组织范围" min-width="190">
          <template #default="{ row }">{{ organizationLabel(row.organization_unit_id) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100" />
        <ElTableColumn prop="version" label="版本" width="90" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElPopconfirm
              v-if="canRevokeBinding && row.status === 'active'"
              title="确认撤销该角色绑定？"
              @confirm="revoke(row)"
            >
              <template #reference><ElButton link type="danger">撤销</ElButton></template>
            </ElPopconfirm>
            <span v-else>-</span>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-16px flex justify-end">
        <ElPagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @update:current-page="changePage"
          @update:page-size="changePageSize"
        />
      </div>
    </template>
  </ElCard>

  <ElDialog v-model="dialogVisible" title="新增角色绑定" width="600px">
    <ElForm ref="formRef" :model="form" :rules="rules" label-position="top">
      <ElFormItem label="主体类型" prop="subject_type">
        <ElSelect v-model="form.subject_type">
          <ElOption
            v-for="option in subjectTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="主体" prop="subject_id">
        <ElSelect
          v-model="form.subject_id"
          filterable
          remote
          :remote-method="searchSubjects"
          :loading="subjectSearching"
          reserve-keyword
        >
          <ElOption v-for="option in subjectOptions" :key="option.value" :label="option.label" :value="option.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="角色" prop="role_id">
        <ElSelect
          v-model="form.role_id"
          filterable
          remote
          :remote-method="searchRoles"
          :loading="roleSearching"
          reserve-keyword
        >
          <ElOption
            v-for="role in roles.filter(item => item.status === 'active')"
            :key="String(role.id)"
            :label="`${role.name} (${role.code})`"
            :value="String(role.id)"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem v-if="bindingScope === 'tenant'" label="组织范围（可选）">
        <ElSelect
          v-model="form.organization_unit_id"
          filterable
          remote
          clearable
          reserve-keyword
          :remote-method="searchOrganizations"
          :loading="organizationSearching"
        >
          <ElOption
            v-for="organization in organizations.filter(item => item.status === 'active')"
            :key="String(organization.id)"
            :label="`${organization.name} (${organization.code})`"
            :value="String(organization.id)"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="dialogVisible = false">取消</ElButton>
      <ElButton v-if="canCreateBinding" type="primary" :loading="submitting" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>
