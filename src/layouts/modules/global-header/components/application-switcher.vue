<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import { applicationEntryPath } from '@/platform/navigation';

defineOptions({ name: 'ApplicationSwitcher' });

const launcherCommand = '__application_launcher__';
const router = useRouter();
const platformStore = usePlatformStore();
const routeStore = useRouteStore();

const selectedName = computed(() => platformStore.selectedApplication?.name || '选择应用');
const selectedIcon = computed(() => platformStore.selectedApplication?.icon || 'mdi:apps');

async function handleCommand(command: string) {
  if (command === launcherCommand) {
    await router.push('/applications');
    return;
  }

  const navigation = platformStore.navigations.find(item => item.application.id === command);
  const entryPath = navigation ? applicationEntryPath(navigation) : '';
  if (!entryPath) {
    window.$message?.warning('该应用尚未发布可访问页面');
    return;
  }

  platformStore.selectApplication(command);
  routeStore.refreshPlatformRoutes();
  await router.push(entryPath);
}
</script>

<template>
  <ElDropdown v-if="platformStore.applications.length" trigger="click" @command="handleCommand">
    <button
      class="mx-8px max-w-220px flex cursor-pointer items-center gap-7px border-0 rounded-6px bg-transparent px-10px py-7px text-left hover:bg-[var(--el-fill-color-light)]"
      type="button"
      aria-label="切换应用"
    >
      <SvgIcon :icon="selectedIcon" class="shrink-0 text-19px text-primary" />
      <span class="truncate text-14px font-medium">{{ selectedName }}</span>
      <SvgIcon icon="mdi:chevron-down" class="shrink-0 text-16px text-gray-400" />
    </button>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem
          v-for="application in platformStore.applications"
          :key="application.id"
          :command="application.id"
          :class="{
            'text-primary font-semibold': application.id === platformStore.selectedApplicationId
          }"
        >
          <SvgIcon :icon="application.icon || 'mdi:application-outline'" class="mr-8px text-17px" />
          <span class="max-w-240px truncate">{{ application.name }}</span>
        </ElDropdownItem>
        <ElDropdownItem divided :command="launcherCommand">
          <SvgIcon icon="mdi:view-grid-outline" class="mr-8px text-17px" />
          返回应用选择页
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>
