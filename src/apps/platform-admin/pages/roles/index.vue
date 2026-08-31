<script setup lang="ts">
import ResourceList from '../../components/resource-list.vue';
import { listRoles } from '../../api';

defineOptions({ name: 'PlatformAdminRoles' });
const columns = [
  { key: 'code', label: '角色编码', minWidth: 160 },
  { key: 'name', label: '角色名称', minWidth: 160 },
  { key: 'description', label: '描述', minWidth: 220 },
  { key: 'data_scope', label: '数据范围', width: 130 },
  { key: 'status', label: '状态', width: 110, kind: 'status' as const },
  { key: 'version', label: '版本', width: 90 }
];
</script>

<template>
  <ResourceList
    title="角色管理"
    description="当前租户的 RBAC 角色。"
    :columns="columns"
    tenant-scoped
    :load="listRoles"
  />
</template>
