<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/modules/auth';
import { usePlatformStore } from '@/store/modules/platform';
import { useRouteStore } from '@/store/modules/route';
import {
  applicationEntryDecision,
  applicationEntryStatusLabel,
  applicationEntryStatusMessage
} from '@/platform/navigation';
import { filterApplications } from '@/platform/application-context';
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
const entryDecisionByApplication = computed(() => {
  return new Map(
    platformStore.navigations.map(navigation => [navigation.application.id, applicationEntryDecision(navigation)])
  );
});

function applicationEntryState(applicationId: string) {
  return entryDecisionByApplication.value.get(applicationId) || applicationEntryDecision();
}

watch(
  () => platformStore.selectedTenantId,
  value => {
    tenantId.value = value;
  }
);

async function changeTenant(value: string) {
  try {
    await platformStore.selectTenant(value);
    routeStore.refreshPlatformRoutes();
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
  const blockedMessage = applicationEntryStatusMessage(decision.status);
  if (blockedMessage) {
    window.$message?.warning(blockedMessage);
    return;
  }

  try {
    platformStore.selectApplication(applicationId);
    routeStore.refreshPlatformRoutes();
    await router.push(decision.path);
  } catch {
    window.$message?.error('应用授权或发布状态已变化，请重新选择');
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
    <ElRow v-else :gutter="16">
      <ElCol v-for="application in filteredApplications" :key="application.id" :xs="24" :sm="12" :lg="8" :xl="6">
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
              </div>
              <SvgIcon icon="mdi:chevron-right" class="mt-14px shrink-0 text-20px text-gray-400" />
            </div>
          </ElCard>
        </button>
      </ElCol>
    </ElRow>
  </BizPageContainer>
</template>
