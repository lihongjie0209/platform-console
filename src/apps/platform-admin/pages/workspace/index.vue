<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlatformStore } from '@/store/modules/platform';
import { applicationMenuEntries } from '@/platform/navigation';
import { governanceDomainEntries } from '../../workspace';

defineOptions({ name: 'PlatformAdminWorkspace' });

const router = useRouter();
const platformStore = usePlatformStore();
const domains = computed(() => {
  const navigation = platformStore.navigations.find(
    item => item.application.id === platformStore.selectedApplicationId
  );
  return governanceDomainEntries(navigation ? applicationMenuEntries(navigation) : []);
});

async function openDomain(path: string) {
  if (path) await router.push(path);
}
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
        <button
          class="mb-12px w-full flex items-start gap-10px border-0 rounded-8px bg-[var(--el-fill-color-light)] p-12px text-left"
          :class="domain.path ? 'cursor-pointer hover:bg-[var(--el-fill-color)]' : 'cursor-not-allowed opacity-60'"
          type="button"
          :disabled="!domain.path"
          @click="openDomain(domain.path)"
        >
          <SvgIcon :icon="domain.icon" class="mt-1px shrink-0 text-22px text-primary" />
          <div class="min-w-0 flex-1">
            <div class="text-14px font-medium">{{ domain.name }}</div>
            <div class="mt-4px text-12px text-gray-500 leading-18px">{{ domain.description }}</div>
          </div>
          <SvgIcon v-if="domain.path" icon="mdi:chevron-right" class="mt-2px text-18px text-gray-400" />
        </button>
      </ElCol>
    </ElRow>
  </ElCard>
</template>
