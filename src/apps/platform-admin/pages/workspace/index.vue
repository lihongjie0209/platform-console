<script setup lang="ts">
const domains = [
  {
    name: '身份与账号',
    description: '用户、服务账号、会话与认证安全。',
    icon: 'mdi:account-key-outline'
  },
  {
    name: '租户与组织',
    description: '租户、组织架构、成员、邀请与用户组。',
    icon: 'mdi:domain'
  },
  {
    name: '统一授权',
    description: '角色、权限、角色授权与主体绑定。',
    icon: 'mdi:shield-key-outline'
  },
  {
    name: '应用治理',
    description: '应用目录、菜单发布与租户应用授权。',
    icon: 'mdi:application-cog-outline'
  }
] as const;

defineOptions({ name: 'PlatformAdminWorkspace' });
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div>
        <div class="text-15px font-semibold">治理域</div>
        <div class="mt-4px text-12px text-gray-400">平台管理应用组合多个后端服务，不与单个微服务绑定。</div>
      </div>
    </template>
    <ElRow :gutter="12">
      <ElCol v-for="domain in domains" :key="domain.name" :xs="24" :sm="12" :lg="6">
        <div class="mb-12px flex items-start gap-10px rounded-8px bg-[var(--el-fill-color-light)] p-12px">
          <SvgIcon :icon="domain.icon" class="mt-1px shrink-0 text-22px text-primary" />
          <div class="min-w-0">
            <div class="text-14px font-medium">{{ domain.name }}</div>
            <div class="mt-4px text-12px text-gray-500 leading-18px">{{ domain.description }}</div>
          </div>
        </div>
      </ElCol>
    </ElRow>
  </ElCard>
</template>
