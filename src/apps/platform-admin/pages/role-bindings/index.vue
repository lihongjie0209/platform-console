<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import type { Binding, BindingForm, Group, Membership, OrganizationUnit, Role, UserIdentity } from '../../api';
import {
  createBinding,
  listBindings,
  listGroups,
  listMemberships,
  listOrganizationUnits,
  listRoles,
  listUsers,
  revokeBinding
} from '../../api';

defineOptions({ name: 'PlatformAdminRoleBindings' });
const platformStore = usePlatformStore();
const loading = ref(false);
const submitting = ref(false);
const rows = ref<Binding[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const roles = ref<Role[]>([]);
const memberships = ref<Membership[]>([]);
const groups = ref<Group[]>([]);
const organizations = ref<OrganizationUnit[]>([]);
const users = ref<UserIdentity[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive<BindingForm>({
  subject_type: 'membership',
  subject_id: '',
  role_id: '',
  organization_unit_id: ''
});
const tenantID = computed(() => platformStore.selectedTenantId);
const roleByID = computed(() => new Map(roles.value.map(item => [String(item.id), item])));
const groupByID = computed(() => new Map(groups.value.map(item => [String(item.id), item])));
const membershipByID = computed(() => new Map(memberships.value.map(item => [String(item.id), item])));
const organizationByID = computed(() => new Map(organizations.value.map(item => [String(item.id), item])));
const userByID = computed(() => new Map(users.value.map(item => [String(item.id), item])));
const subjectOptions = computed(() => {
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
    const result = await listBindings({ tenantID: tenantID.value, page: page.value, pageSize: pageSize.value });
    rows.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}
async function loadCatalogs() {
  if (!tenantID.value) return;
  const [rolePage, membershipPage, groupPage, organizationItems, userPage] = await Promise.all([
    listRoles(tenantID.value, 1, 100),
    listMemberships({ tenantID: tenantID.value, page: 1, pageSize: 100 }),
    listGroups(tenantID.value, 1, 100),
    listOrganizationUnits(tenantID.value),
    listUsers({ page: 1, pageSize: 100 })
  ]);
  roles.value = rolePage.items;
  memberships.value = membershipPage.memberships;
  groups.value = groupPage.items;
  organizations.value = organizationItems;
  users.value = userPage.items;
}
function openCreate() {
  Object.assign(form, { subject_type: 'membership', subject_id: '', role_id: '', organization_unit_id: '' });
  formRef.value?.clearValidate();
  dialogVisible.value = true;
}
async function submit() {
  if (!(await formRef.value?.validate())) return;
  submitting.value = true;
  try {
    await createBinding(tenantID.value, form);
    dialogVisible.value = false;
    window.$message?.success('角色已绑定');
    await loadRows();
  } finally {
    submitting.value = false;
  }
}
async function revoke(row: Binding) {
  await revokeBinding(String(row.id), Number(row.version));
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
  () => {
    form.subject_id = '';
  }
);
watch(tenantID, async () => {
  page.value = 1;
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
          <p class="mb-0 mt-6px text-13px text-#999">向租户成员、成员组或服务账号授予角色，可选组织范围。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElButton :loading="loading" @click="loadRows">刷新</ElButton>
          <ElButton type="primary" :disabled="!tenantID" @click="openCreate">新增绑定</ElButton>
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
            <ElPopconfirm v-if="row.status === 'active'" title="确认撤销该角色绑定？" @confirm="revoke(row)">
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
          <ElOption label="租户成员" value="membership" />
          <ElOption label="成员组" value="group" />
          <ElOption label="服务账号" value="service_account" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="主体" prop="subject_id">
        <ElInput
          v-if="form.subject_type === 'service_account'"
          v-model="form.subject_id"
          placeholder="输入服务账号 ID"
        />
        <ElSelect v-else v-model="form.subject_id" filterable>
          <ElOption v-for="option in subjectOptions" :key="option.value" :label="option.label" :value="option.value" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="角色" prop="role_id">
        <ElSelect v-model="form.role_id" filterable>
          <ElOption
            v-for="role in roles.filter(item => item.status === 'active')"
            :key="String(role.id)"
            :label="`${role.name} (${role.code})`"
            :value="String(role.id)"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="组织范围（可选）">
        <ElSelect v-model="form.organization_unit_id" filterable clearable>
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
      <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
    </template>
  </ElDialog>
</template>
