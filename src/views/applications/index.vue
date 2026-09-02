<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { PlatformApplication } from '@/service/api/platform-navigation';
import { useAuthStore } from '@/store/modules/auth';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import { switchTenantContext } from '@/platform/tenant-switch';
import { switchApplicationContext } from '@/platform/application-switch';
import {
  applicationEntryDecision,
  applicationEntryStatusLabel,
  applicationNavigationCompatibility
} from '@/platform/navigation';
import { filterApplications } from '@/platform/application-context';
import { groupApplications } from '@/platform/application-groups';
import { BizEmptyState, BizPageContainer } from '@/components/business';

defineOptions({ name: 'ApplicationLauncher' });

const router = useRouter();
const authStore = useAuthStore();
const platformStore = usePlatformStore();
const routeStore = useRouteStore();
const keyword = ref('');
const tenantId = ref(platformStore.selectedTenantId);

const filteredApplications = computed(() => {
  return filterApplications(platformStore.applications, keyword.value);
});
const applicationGroups = computed(() => groupApplications(filteredApplications.value));
const entryDecisionByApplication = computed(() => {
  return new Map(
    platformStore.navigations.map(navigation => [navigation.application.id, applicationEntryDecision(navigation)])
  );
});
const compatibilityByApplication = computed(() => {
  return new Map(
    platformStore.navigations.map(navigation => [
      navigation.application.id,
      applicationNavigationCompatibility(navigation)
    ])
  );
});
const recentApplications = computed(() => {
  if (keyword.value) return [];
  const byId = new Map(platformStore.applications.map(application => [application.id, application]));
  return platformStore.recentApplicationIds
    .map(id => byId.get(id))
    .filter((application): application is PlatformApplication => {
      if (!application) return false;
      return applicationEntryState(application.id).status === 'ready';
    });
});

function applicationEntryState(applicationId: string) {
  return entryDecisionByApplication.value.get(applicationId) || applicationEntryDecision();
}

function applicationCompatibility(applicationId: string) {
  return compatibilityByApplication.value.get(applicationId);
}

watch(
  () => platformStore.selectedTenantId,
  value => {
    tenantId.value = value;
  }
);

async function changeTenant(value: string) {
  try {
    await switchTenantContext(value, {
      selectTenant: platformStore.selectTenant,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      openApplicationLauncher: () => router.push('/applications')
    });
  } catch (error) {
    tenantId.value = platformStore.selectedTenantId;
    window.$message?.error(error instanceof Error ? error.message : '切换租户失败');
  }
}

async function reloadApplications() {
  try {
    await platformStore.initialize(authStore.userInfo.subject, { force: true });
    routeStore.refreshPlatformRoutes();
  } catch {
    // The store keeps the user-facing error for the empty state.
  }
}

async function openApplication(applicationId: string) {
  const navigation = platformStore.navigations.find(item => item.application.id === applicationId);
  const decision = applicationEntryDecision(navigation);
  try {
    await switchApplicationContext(applicationId, decision, {
      selectApplication: platformStore.selectApplication,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      entryPathForApplication: platformStore.entryPathForApplication,
      navigate: path => router.push(path)
    });
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '应用授权或发布状态已变化，请重新选择');
    await router.push('/applications');
  }
}
</script>

<template>
  <BizPageContainer
    title="选择应用"
    :description="`欢迎，${authStore.userInfo.subject}。请选择要进入的业务应用。`"
    :loading="platformStore.loading"
  >
    <template #actions>
      <ElSelect v-model="tenantId" class="w-240px" placeholder="选择租户" filterable @change="changeTenant">
        <ElOption v-for="tenant in platformStore.tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
      </ElSelect>
    </template>

    <div v-if="platformStore.tenants.length" class="mb-20px flex justify-end">
      <ElInput v-model="keyword" class="w-320px" clearable placeholder="搜索应用名称、编码或说明">
        <template #prefix><SvgIcon icon="mdi:magnify" /></template>
      </ElInput>
    </div>

    <BizEmptyState
      v-if="platformStore.errorMessage"
      title="应用加载失败"
      :description="platformStore.errorMessage"
      action-text="重新加载"
      @action="reloadApplications"
    />
    <BizEmptyState
      v-else-if="!platformStore.tenants.length"
      description="当前账号尚未加入任何可用租户，请联系平台管理员。"
    />
    <BizEmptyState
      v-else-if="!filteredApplications.length"
      :description="keyword ? '没有匹配的应用' : '当前租户尚未获得任何应用授权'"
    />
    <div v-else class="flex flex-col gap-24px">
      <section v-if="recentApplications.length">
        <div class="mb-12px flex items-center gap-8px">
          <h2 class="m-0 text-15px font-semibold">最近访问</h2>
          <ElTag size="small" effect="plain">{{ recentApplications.length }}</ElTag>
        </div>
        <div class="flex flex-wrap gap-10px">
          <ElButton
            v-for="application in recentApplications"
            :key="application.id"
            plain
            @click="openApplication(application.id)"
          >
            <SvgIcon :icon="application.icon || 'mdi:application-outline'" class="mr-6px text-17px" />
            {{ application.name }}
          </ElButton>
        </div>
      </section>
      <section v-for="group in applicationGroups" :key="group.category">
        <div class="mb-12px flex items-center gap-8px">
          <h2 class="m-0 text-15px font-semibold">{{ group.label }}</h2>
          <ElTag size="small" effect="plain">{{ group.applications.length }}</ElTag>
        </div>
        <ElRow :gutter="16">
          <ElCol v-for="application in group.applications" :key="application.id" :xs="24" :sm="12" :lg="8" :xl="6">
            <button
              class="mb-16px w-full cursor-pointer border-0 bg-transparent p-0 text-left"
              :class="{
                'cursor-not-allowed opacity-65': applicationEntryState(application.id).status !== 'ready'
              }"
              type="button"
              @click="openApplication(application.id)"
            >
              <ElCard
                class="h-full transition-transform duration-200 hover:shadow-lg hover:-translate-y-2px"
                shadow="hover"
              >
                <div class="flex items-start gap-14px">
                  <div class="size-48px flex-center shrink-0 rounded-10px bg-primary-50 text-primary">
                    <SvgIcon :icon="application.icon || 'mdi:application-outline'" class="text-28px" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-16px font-semibold">
                      {{ application.name }}
                    </div>
                    <div class="mt-3px flex items-center gap-8px text-12px text-gray-400">
                      <span class="truncate">{{ application.code }}</span>
                      <ElTag
                        v-if="applicationEntryState(application.id).status !== 'ready'"
                        size="small"
                        type="warning"
                        effect="plain"
                      >
                        {{ applicationEntryStatusLabel(applicationEntryState(application.id).status) }}
                      </ElTag>
                    </div>
                    <p class="mb-0 mt-12px min-h-40px text-13px text-gray-500 leading-20px">
                      {{ application.description || '暂无应用说明' }}
                    </p>
                    <div class="mt-10px flex flex-wrap items-center gap-6px text-12px text-gray-400">
                      <span>
                        {{
                          (applicationCompatibility(application.id)?.supportedPages || 0) +
                          (applicationCompatibility(application.id)?.externalPages || 0)
                        }}
                        个可用功能
                      </span>
                      <ElTag
                        v-if="applicationCompatibility(application.id)?.unsupportedPages"
                        size="small"
                        type="warning"
                        effect="plain"
                      >
                        {{ applicationCompatibility(application.id)?.unsupportedPages }} 个页面待安装
                      </ElTag>
                    </div>
                  </div>
                  <SvgIcon icon="mdi:chevron-right" class="mt-14px shrink-0 text-20px text-gray-400" />
                </div>
              </ElCard>
            </button>
          </ElCol>
        </ElRow>
      </section>
    </div>
  </BizPageContainer>
</template>
