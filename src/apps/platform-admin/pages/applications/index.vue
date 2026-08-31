<script setup lang="ts">
import ResourceList from '../../components/resource-list.vue';
import { listApplications } from '../../api';

defineOptions({ name: 'PlatformAdminApplications' });

const columns = [
  { key: 'code', label: '应用编码', minWidth: 160 },
  { key: 'name', label: '应用名称', minWidth: 160 },
  { key: 'description', label: '描述', minWidth: 220 },
  { key: 'default_route', label: '默认路由', minWidth: 160 },
  { key: 'status', label: '状态', width: 110, kind: 'status' as const },
  { key: 'version', label: '版本', width: 90 }
];
</script>

<template>
  <ResourceList
    title="应用管理"
    description="管理平台与业务应用的基本信息；菜单发布将作为后续独立工作台。"
    :columns="columns"
    :load="(_tenantID, page, pageSize) => listApplications(page, pageSize)"
  />
</template>
