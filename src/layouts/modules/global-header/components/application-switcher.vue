<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import {
  applicationEntryDecision,
  applicationEntryStatusLabel,
  applicationEntryStatusMessage
} from '@/platform/navigation';
import { groupApplications } from '@/platform/application-groups';

defineOptions({ name: 'ApplicationSwitcher' });

const launcherCommand = '__application_launcher__';
const router = useRouter();
const platformStore = usePlatformStore();
const routeStore = useRouteStore();

const selectedName = computed(() => platformStore.selectedApplication?.name || '选择应用');
const selectedIcon = computed(() => platformStore.selectedApplication?.icon || 'mdi:apps');
const switcherGroups = computed(() =>
  groupApplications(platformStore.applications).map(group => ({
    ...group,
    applications: group.applications.map(application => ({
      application,
      decision: applicationEntryDecision(platformStore.navigations.find(item => item.application.id === application.id))
    }))
  }))
);

function entryDecision(applicationId: string) {
  return applicationEntryDecision(platformStore.navigations.find(item => item.application.id === applicationId));
}

async function handleCommand(command: string) {
  if (command === launcherCommand) {
    await router.push('/applications');
    return;
  }

  const decision = entryDecision(command);
  const blockedMessage = applicationEntryStatusMessage(decision.status);
  if (blockedMessage) {
    window.$message?.warning(blockedMessage);
    return;
  }

  try {
    platformStore.selectApplication(command);
    routeStore.refreshPlatformRoutes();
    await router.push(decision.path);
  } catch {
    window.$message?.error('应用授权或发布状态已变化，请重新选择');
    await router.push('/applications');
  }
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
        <template v-for="(group, groupIndex) in switcherGroups" :key="group.category">
          <ElDropdownItem :divided="groupIndex > 0" disabled class="cursor-default text-12px text-gray-400">
            {{ group.label }}
          </ElDropdownItem>
          <ElDropdownItem
            v-for="item in group.applications"
            :key="item.application.id"
            :command="item.application.id"
            :disabled="item.decision.status !== 'ready'"
            :class="{
              'text-primary font-semibold': item.application.id === platformStore.selectedApplicationId
            }"
          >
            <SvgIcon :icon="item.application.icon || 'mdi:application-outline'" class="mr-8px text-17px" />
            <span class="max-w-240px truncate">{{ item.application.name }}</span>
            <ElTag v-if="item.decision.status !== 'ready'" class="ml-8px" size="small" type="warning">
              {{ applicationEntryStatusLabel(item.decision.status) }}
            </ElTag>
          </ElDropdownItem>
        </template>
        <ElDropdownItem divided :command="launcherCommand">
          <SvgIcon icon="mdi:view-grid-outline" class="mr-8px text-17px" />
          返回应用选择页
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>
