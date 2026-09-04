<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { remoteSearchPage } from '@/platform/remote-search';
import { operationIdempotencyKey } from '@/platform/idempotency-key';
import { confirmUserAction } from '@/platform/user-action';
import {
  type AuthorizationManagementScope,
  authorizationManagementScopeOptions
} from '@/platform/authorization-management';
import type { Permission, Role, RolePermission } from '../../api';
import {
  batchGetMyRolePermissions,
  grantMyRolePermission,
  listMyPermissionCatalog,
  listMyRoles,
  revokeMyRolePermission
} from '../../api';

defineOptions({ name: 'PlatformAdminRolePermissions' });
const platformStore = usePlatformStore();
const loading = ref(false);
const changing = ref('');
const roleSearching = ref(false);
const roles = ref<Role[]>([]);
const permissions = ref<Permission[]>([]);
const assignments = ref<RolePermission[]>([]);
const roleID = ref('');
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const assignmentScope = ref<AuthorizationManagementScope>('tenant');
const tenantID = computed(() => platformStore.selectedTenantId);
const canGrantPermission = computed(() =>
  platformStore.hasPermission({ scope: assignmentScope.value, codes: 'authorization.role-permission.grant' })
);
const canRevokePermission = computed(() =>
  platformStore.hasPermission({ scope: assignmentScope.value, codes: 'authorization.role-permission.revoke' })
);
const assignmentByPermission = computed(() => new Map(assignments.value.map(item => [item.permission_id, item])));
const mutationKeys = new Map<string, string>();

async function loadCatalogs() {
  if (!tenantID.value) {
    roles.value = [];
    permissions.value = [];
    return;
  }
  loading.value = true;
  try {
    const rolePage = await listMyRoles({
      tenantID: tenantID.value,
      permissionScope: assignmentScope.value,
      ...remoteSearchPage(20),
      status: 'active'
    });
    roles.value = rolePage.items;
    if (!roles.value.some(item => item.id === roleID.value)) roleID.value = roles.value[0]?.id || '';
    await loadPermissions();
  } finally {
    loading.value = false;
  }
}
async function searchRoles(value = '') {
  if (!tenantID.value) return;
  roleSearching.value = true;
  try {
    const result = await listMyRoles({
      tenantID: tenantID.value,
      permissionScope: assignmentScope.value,
      ...remoteSearchPage(20),
      keyword: value,
      status: 'active'
    });
    const catalog = new Map(roles.value.map(item => [item.id, item]));
    for (const item of result.items) catalog.set(item.id, item);
    roles.value = [...catalog.values()];
  } finally {
    roleSearching.value = false;
  }
}
async function loadPermissions() {
  if (!tenantID.value) return;
  loading.value = true;
  try {
    const result = await listMyPermissionCatalog({
      tenantID: tenantID.value,
      permissionScope: assignmentScope.value,
      search: keyword.value.trim(),
      page: page.value,
      pageSize: pageSize.value
    });
    permissions.value = result.items;
    total.value = result.total;
    await loadAssignments();
  } finally {
    loading.value = false;
  }
}

async function loadAssignments() {
  const permissionIDs = permissions.value.map(item => item.id);
  if (!roleID.value || !permissionIDs.length) {
    assignments.value = [];
    return;
  }
  loading.value = true;
  try {
    assignments.value = (
      await batchGetMyRolePermissions({
        tenantID: tenantID.value,
        permissionScope: assignmentScope.value,
        roleID: roleID.value,
        permissionIDs
      })
    ).role_permissions;
  } finally {
    loading.value = false;
  }
}
async function searchPermissions() {
  page.value = 1;
  await loadPermissions();
}
async function changePage(value: number) {
  page.value = value;
  await loadPermissions();
}
async function changePageSize(value: number) {
  page.value = 1;
  pageSize.value = value;
  await loadPermissions();
}

async function toggle(permission: Permission, enabled: boolean) {
  if ((enabled && !canGrantPermission.value) || (!enabled && !canRevokePermission.value)) return;
  const assignment = assignmentByPermission.value.get(permission.id);
  changing.value = permission.id;
  try {
    if (enabled) {
      const operation = `grant:${tenantID.value}:${assignmentScope.value}:${roleID.value}:${permission.id}`;
      await grantMyRolePermission(
        {
          tenantID: tenantID.value,
          permissionScope: assignmentScope.value,
          roleID: roleID.value,
          permissionID: permission.id
        },
        operationIdempotencyKey(mutationKeys, operation)
      );
      mutationKeys.delete(operation);
    } else if (assignment) {
      const confirmed = await confirmUserAction(() =>
        ElMessageBox.confirm(`确认从当前角色撤销权限“${permission.code}”吗？`, '撤销角色权限', {
          type: 'warning'
        })
      );
      if (!confirmed) return;
      const operation = `revoke:${tenantID.value}:${assignmentScope.value}:${assignment.id}:${assignment.version}`;
      await revokeMyRolePermission({
        tenantID: tenantID.value,
        permissionScope: assignmentScope.value,
        rolePermissionID: assignment.id,
        version: assignment.version,
        idempotencyKey: operationIdempotencyKey(mutationKeys, operation)
      });
      mutationKeys.delete(operation);
    }
    window.$message?.success(enabled ? '权限已授予' : '权限已撤销');
    await loadAssignments();
  } finally {
    changing.value = '';
  }
}

watch([tenantID, assignmentScope], async () => {
  roleID.value = '';
  page.value = 1;
  assignments.value = [];
  await loadCatalogs();
  await loadAssignments();
});
watch(roleID, loadAssignments);
onMounted(loadCatalogs);
</script>

<template>
  <ElCard class="card-wrapper" shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0 text-18px font-semibold">角色权限</h2>
          <p class="mb-0 mt-6px text-13px text-#999">按租户或平台作用域维护角色权限，授予与撤销均可重复操作。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSegmented v-model="assignmentScope" :options="authorizationManagementScopeOptions" />
          <ElSelect
            v-model="roleID"
            class="w-260px"
            filterable
            remote
            :remote-method="searchRoles"
            :loading="roleSearching"
            reserve-keyword
            placeholder="选择角色"
          >
            <ElOption v-for="role in roles" :key="role.id" :label="`${role.name} (${role.code})`" :value="role.id" />
          </ElSelect>
          <ElInput
            v-model="keyword"
            class="w-220px"
            clearable
            placeholder="搜索权限"
            @keyup.enter="searchPermissions"
            @clear="searchPermissions"
          />
          <ElButton @click="searchPermissions">搜索</ElButton>
          <ElButton :loading="loading" @click="loadAssignments">刷新</ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <ElEmpty
      v-else-if="!roles.length"
      :description="`${assignmentScope === 'platform' ? '平台' : '当前租户'}暂无角色，请先创建角色`"
    />
    <template v-else>
      <ElTable v-loading="loading" :data="permissions" border stripe>
        <ElTableColumn prop="code" label="权限编码" min-width="190" />
        <ElTableColumn prop="name" label="权限名称" min-width="160" />
        <ElTableColumn prop="resource_type" label="资源类型" min-width="150" />
        <ElTableColumn prop="action" label="操作" width="120" />
        <ElTableColumn label="授权状态" width="130" fixed="right">
          <template #default="{ row }">
            <ElSwitch
              v-if="canGrantPermission || canRevokePermission"
              :model-value="assignmentByPermission.get(row.id)?.status === 'active'"
              :loading="changing === row.id"
              :disabled="
                assignmentByPermission.get(row.id)?.status === 'active' ? !canRevokePermission : !canGrantPermission
              "
              @change="value => toggle(row, Boolean(value))"
            />
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
</template>
