<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { Permission, Role, RolePermission } from '../../api';
import { grantRolePermission, listPermissions, listRolePermissions, listRoles, revokeRolePermission } from '../../api';

defineOptions({ name: 'PlatformAdminRolePermissions' });
const platformStore = usePlatformStore();
const loading = ref(false);
const changing = ref('');
const roles = ref<Role[]>([]);
const permissions = ref<Permission[]>([]);
const assignments = ref<RolePermission[]>([]);
const roleID = ref('');
const keyword = ref('');
const tenantID = computed(() => platformStore.selectedTenantId);
const assignmentByPermission = computed(() => new Map(assignments.value.map(item => [item.permission_id, item])));
const rows = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  return permissions.value.filter(
    item => !value || `${item.code} ${item.name} ${item.resource_type} ${item.action}`.toLowerCase().includes(value)
  );
});

async function loadCatalogs() {
  if (!tenantID.value) {
    roles.value = [];
    permissions.value = [];
    return;
  }
  loading.value = true;
  try {
    const [rolePage, permissionPage] = await Promise.all([
      listRoles(tenantID.value, 1, 100),
      listPermissions(tenantID.value, 1, 100)
    ]);
    roles.value = rolePage.items;
    permissions.value = permissionPage.items;
    if (!roles.value.some(item => item.id === roleID.value)) roleID.value = roles.value[0]?.id || '';
  } finally {
    loading.value = false;
  }
}

async function loadAssignments() {
  if (!roleID.value) {
    assignments.value = [];
    return;
  }
  loading.value = true;
  try {
    assignments.value = (await listRolePermissions(roleID.value)).role_permissions || [];
  } finally {
    loading.value = false;
  }
}

async function toggle(permission: Permission, enabled: boolean) {
  const assignment = assignmentByPermission.value.get(permission.id);
  changing.value = permission.id;
  try {
    if (enabled) await grantRolePermission(tenantID.value, roleID.value, permission.id);
    else if (assignment) await revokeRolePermission(assignment.id, assignment.version);
    window.$message?.success(enabled ? '权限已授予' : '权限已撤销');
    await loadAssignments();
  } finally {
    changing.value = '';
  }
}

watch(tenantID, async () => {
  roleID.value = '';
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
          <p class="mb-0 mt-6px text-13px text-#999">按当前租户和角色维护权限，授予与撤销均可重复操作。</p>
        </div>
        <div class="flex-y-center gap-8px">
          <ElSelect v-model="roleID" class="w-260px" filterable placeholder="选择角色">
            <ElOption v-for="role in roles" :key="role.id" :label="`${role.name} (${role.code})`" :value="role.id" />
          </ElSelect>
          <ElInput v-model="keyword" class="w-220px" clearable placeholder="搜索权限" />
          <ElButton :loading="loading" @click="loadAssignments">刷新</ElButton>
        </div>
      </div>
    </template>
    <ElAlert v-if="!tenantID" title="请先在应用选择页选择租户" type="warning" show-icon :closable="false" />
    <ElEmpty v-else-if="!roles.length" description="当前租户暂无角色，请先创建角色" />
    <ElTable v-else v-loading="loading" :data="rows" border stripe>
      <ElTableColumn prop="code" label="权限编码" min-width="190" />
      <ElTableColumn prop="name" label="权限名称" min-width="160" />
      <ElTableColumn prop="resource_type" label="资源类型" min-width="150" />
      <ElTableColumn prop="action" label="操作" width="120" />
      <ElTableColumn label="授权状态" width="130" fixed="right">
        <template #default="{ row }">
          <ElSwitch
            :model-value="assignmentByPermission.get(row.id)?.status === 'active'"
            :loading="changing === row.id"
            @change="value => toggle(row, Boolean(value))"
          />
        </template>
      </ElTableColumn>
    </ElTable>
  </ElCard>
</template>
