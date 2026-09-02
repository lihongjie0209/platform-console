<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import { groupApplications } from '@/platform/application-groups';
import { switchApplicationContext } from '@/platform/application-switch';
import { switchTenantContext } from '@/platform/tenant-switch';
import { applicationEntryDecision, applicationEntryStatusLabel } from '@/platform/navigation';

defineOptions({ name: 'MobileContextSwitcher' });

const router = useRouter();
const platformStore = usePlatformStore();
const routeStore = useRouteStore();
const visible = ref(false);
const switching = ref(false);
const applicationGroups = computed(() =>
  groupApplications(platformStore.applications).map(group => ({
    ...group,
    applications: group.applications.map(application => ({
      application,
      decision: applicationEntryDecision(platformStore.navigations.find(item => item.application.id === application.id))
    }))
  }))
);

async function openLauncher() {
  visible.value = false;
  await router.push('/applications');
}

async function changeTenant(tenantId: string) {
  if (switching.value || tenantId === platformStore.selectedTenantId) return;
  switching.value = true;
  try {
    await switchTenantContext(tenantId, {
      selectTenant: platformStore.selectTenant,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      openApplicationLauncher: () => router.push('/applications')
    });
    visible.value = false;
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '切换租户失败');
  } finally {
    switching.value = false;
  }
}

async function changeApplication(applicationId: string) {
  if (switching.value || applicationId === platformStore.selectedApplicationId) return;
  const decision = applicationEntryDecision(
    platformStore.navigations.find(item => item.application.id === applicationId)
  );
  switching.value = true;
  try {
    await switchApplicationContext(applicationId, decision, {
      selectApplication: platformStore.selectApplication,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      entryPathForApplication: platformStore.entryPathForApplication,
      navigate: path => router.push(path)
    });
    visible.value = false;
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '切换应用失败');
  } finally {
    switching.value = false;
  }
}
</script>

<template>
  <ElButton text circle aria-label="切换租户或应用" @click="visible = true">
    <SvgIcon icon="mdi:apps" class="text-20px" />
  </ElButton>
  <ElDrawer v-model="visible" title="工作上下文" direction="rtl" size="min(88vw, 360px)" append-to-body>
    <div class="flex flex-col gap-20px">
      <section>
        <div class="mb-8px text-13px text-gray-500">当前租户</div>
        <ElSelect
          :model-value="platformStore.selectedTenantId"
          class="w-full"
          filterable
          :loading="switching"
          @change="changeTenant"
        >
          <ElOption v-for="tenant in platformStore.tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
        </ElSelect>
      </section>

      <section>
        <div class="mb-8px text-13px text-gray-500">当前应用</div>
        <ElSelect
          :model-value="platformStore.selectedApplicationId"
          class="w-full"
          filterable
          :loading="switching"
          placeholder="选择应用"
          @change="changeApplication"
        >
          <ElOptionGroup v-for="group in applicationGroups" :key="group.category" :label="group.label">
            <ElOption
              v-for="item in group.applications"
              :key="item.application.id"
              :label="`${item.application.name}${item.decision.status === 'ready' ? '' : ` · ${applicationEntryStatusLabel(item.decision.status)}`}`"
              :value="item.application.id"
              :disabled="item.decision.status !== 'ready'"
            />
          </ElOptionGroup>
        </ElSelect>
      </section>

      <ElButton class="w-full" @click="openLauncher">
        <SvgIcon icon="mdi:view-grid-outline" class="mr-6px" />
        打开应用选择页
      </ElButton>
    </div>
  </ElDrawer>
</template>
