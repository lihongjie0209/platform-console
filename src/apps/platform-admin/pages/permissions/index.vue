<script setup lang="ts">
import ResourceList from '../../components/resource-list.vue';
import { listPermissions } from '../../api';

defineOptions({ name: 'PlatformAdminPermissions' });
const columns = [
  { key: 'code', label: '权限编码', minWidth: 180 },
  { key: 'name', label: '权限名称', minWidth: 160 },
  { key: 'resource_type', label: '资源类型', minWidth: 150 },
  { key: 'action', label: '操作', width: 120 },
  { key: 'condition_expression', label: '条件表达式', minWidth: 220 },
  { key: 'version', label: '版本', width: 90 }
];
</script>

<template>
  <ResourceList
    title="权限管理"
    description="当前租户的资源、操作与 ABAC 条件定义。"
    :columns="columns"
    tenant-scoped
    :load="listPermissions"
  />
</template>
