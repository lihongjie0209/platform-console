<script setup lang="ts">
import ResourceList from '../../components/resource-list.vue';
import { listUsers } from '../../api';

defineOptions({ name: 'PlatformAdminUsers' });
const columns = [
  { key: 'username', label: '用户名', minWidth: 150 },
  { key: 'display_name', label: '显示名称', minWidth: 150 },
  { key: 'email', label: '邮箱', minWidth: 210 },
  { key: 'phone', label: '手机号', minWidth: 150 },
  { key: 'status', label: '状态', width: 110, kind: 'status' as const },
  { key: 'version', label: '版本', width: 90 }
];
</script>

<template>
  <ResourceList title="用户管理" description="统一身份用户及其账号状态。" :columns="columns" :load="listUsers" />
</template>
