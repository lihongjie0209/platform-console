<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { applicationMenuEntries, applicationNavigationCompatibility } from '@/platform/navigation';
import { applicationCategoryDetails } from '@/platform/application-groups';
import { BizEmptyState, BizPageContainer } from '@/components/business';

defineOptions({ name: 'ApplicationWorkspace' });

const router = useRouter();
const platformStore = usePlatformStore();

const navigation = computed(() =>
  platformStore.navigations.find(item => item.application.id === platformStore.selectedApplicationId)
);
const application = computed(() => navigation.value?.application || platformStore.selectedApplication);
const entries = computed(() => (navigation.value ? applicationMenuEntries(navigation.value) : []));
const category = computed(() => (application.value ? applicationCategoryDetails(application.value) : undefined));
const compatibility = computed(() =>
  navigation.value
    ? applicationNavigationCompatibility(navigation.value)
    : { supportedPages: 0, unsupportedPages: 0, externalPages: 0, usable: false }
);
const availableEntryCount = computed(() => compatibility.value.supportedPages + compatibility.value.externalPages);

async function openEntry(entry: (typeof entries.value)[number]) {
  if (entry.externalURL) {
    window.open(entry.externalURL, '_blank', 'noopener,noreferrer');
    return;
  }
  await router.push(entry.path);
}
</script>

<template>
  <BizPageContainer
    :title="application?.name || '应用概览'"
    :description="application?.description || '当前应用的功能入口与运行上下文。'"
  >
    <template #actions>
      <ElTag v-if="application?.code" effect="plain">{{ application.code }}</ElTag>
    </template>

    <ElDescriptions class="mb-20px" :column="4" border>
      <ElDescriptionsItem label="当前租户">
        {{ platformStore.selectedTenant?.name || platformStore.selectedTenantId || '-' }}
      </ElDescriptionsItem>
      <ElDescriptionsItem label="应用分类">{{ category?.label || '业务应用' }}</ElDescriptionsItem>
      <ElDescriptionsItem label="可用功能">{{ availableEntryCount }}</ElDescriptionsItem>
      <ElDescriptionsItem label="控制台兼容性">
        <ElTag v-if="compatibility.unsupportedPages" type="warning" effect="plain">
          {{ compatibility.unsupportedPages }} 个页面待安装
        </ElTag>
        <ElTag v-else type="success" effect="plain">已兼容</ElTag>
      </ElDescriptionsItem>
    </ElDescriptions>

    <BizEmptyState
      v-if="!entries.length"
      title="应用尚未发布功能页面"
      description="应用授权已经生效；管理员发布菜单后，功能入口会自动出现在这里。"
    />
    <ElRow v-else :gutter="16">
      <ElCol v-for="entry in entries" :key="entry.id" :xs="24" :sm="12" :lg="8" :xl="6">
        <button
          class="mb-16px w-full cursor-pointer border-0 bg-transparent p-0 text-left"
          type="button"
          @click="openEntry(entry)"
        >
          <ElCard class="h-full hover:shadow-md" shadow="hover">
            <div class="flex items-center gap-12px">
              <div class="size-42px flex-center shrink-0 rounded-9px bg-primary-50 text-primary">
                <SvgIcon :icon="entry.icon" class="text-24px" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-15px font-medium">{{ entry.name }}</div>
                <div class="mt-4px truncate text-12px text-gray-400">{{ entry.code }}</div>
              </div>
              <SvgIcon
                :icon="entry.externalURL ? 'mdi:open-in-new' : 'mdi:chevron-right'"
                class="text-18px text-gray-400"
              />
            </div>
          </ElCard>
        </button>
      </ElCol>
    </ElRow>
  </BizPageContainer>
</template>
