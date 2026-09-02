<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import { switchTenantContext } from '@/platform/tenant-switch';

defineOptions({ name: 'TenantSwitcher' });

const router = useRouter();
const platformStore = usePlatformStore();
const routeStore = useRouteStore();
const switching = ref(false);

async function handleCommand(tenantId: string) {
  if (switching.value || tenantId === platformStore.selectedTenantId) return;
  switching.value = true;
  try {
    await switchTenantContext(tenantId, {
      selectTenant: platformStore.selectTenant,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      openApplicationLauncher: () => router.push('/applications')
    });
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '切换租户失败');
  } finally {
    switching.value = false;
  }
}
</script>

<template>
  <ElDropdown v-if="platformStore.tenants.length > 1" trigger="click" :disabled="switching" @command="handleCommand">
    <button
      class="mx-4px max-w-180px flex cursor-pointer items-center gap-7px border-0 rounded-6px bg-transparent px-10px py-7px text-left disabled:cursor-wait hover:bg-[var(--el-fill-color-light)]"
      type="button"
      aria-label="切换租户"
      :disabled="switching"
    >
      <SvgIcon icon="mdi:office-building-outline" class="shrink-0 text-18px text-primary" />
      <span class="truncate text-14px">{{ platformStore.selectedTenant?.name || '选择租户' }}</span>
      <SvgIcon :icon="switching ? 'mdi:loading' : 'mdi:chevron-down'" :class="{ 'animate-spin': switching }" />
    </button>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem
          v-for="tenant in platformStore.tenants"
          :key="tenant.id"
          :command="tenant.id"
          :disabled="tenant.id === platformStore.selectedTenantId"
          :class="{ 'text-primary font-semibold': tenant.id === platformStore.selectedTenantId }"
        >
          <SvgIcon icon="mdi:office-building-outline" class="mr-8px text-17px" />
          <span class="max-w-240px truncate">{{ tenant.name }}</span>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>
