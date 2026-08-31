<script setup lang="ts">
import ResourceList from '../../components/resource-list.vue';
import { listGroups } from '../../api';

defineOptions({ name: 'PlatformAdminGroups' });
const columns = [
  { key: 'code', label: '成员组编码', minWidth: 180 },
  { key: 'name', label: '成员组名称', minWidth: 180 },
  { key: 'status', label: '状态', width: 110, kind: 'status' as const },
  { key: 'updated_at', label: '更新时间', minWidth: 180 },
  { key: 'version', label: '版本', width: 90 }
];
</script>

<template>
  <ResourceList
    title="成员组管理"
    description="当前租户下的成员分组。"
    :columns="columns"
    tenant-scoped
    :load="listGroups"
  />
</template>
