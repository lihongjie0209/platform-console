<script lang="ts" setup>
import { useThemeStore } from '@/store/modules/theme';
import type { ApplicationSearchResult } from '@/platform/application-search';

defineOptions({ name: 'SearchResult' });

interface Props {
  options: ApplicationSearchResult[];
}

defineProps<Props>();

interface Emits {
  (e: 'enter'): void;
}

const emit = defineEmits<Emits>();

const theme = useThemeStore();

const activeKey = defineModel<string>('activeKey', { required: true });

async function handleMouseEnter(item: ApplicationSearchResult) {
  activeKey.value = item.key;
}

function handleTo(item: ApplicationSearchResult) {
  activeKey.value = item.key;
  emit('enter');
}
</script>

<template>
  <ElScrollbar>
    <div class="pb-12px">
      <template v-for="item in options" :key="item.key">
        <div
          class="mt-8px h-56px flex-y-center cursor-pointer justify-between rounded-4px bg-#e5e7eb px-14px dark:bg-dark"
          :style="{
            background: item.key === activeKey ? theme.themeColor : '',
            color: item.key === activeKey ? '#fff' : ''
          }"
          @click="handleTo(item)"
          @mouseenter="handleMouseEnter(item)"
        >
          <SvgIcon :icon="item.icon" class="shrink-0 text-18px" />
          <span class="ml-8px min-w-0 flex-1">
            <span class="block truncate">{{ item.label }}</span>
            <span class="block truncate text-11px opacity-70">{{ item.applicationName }} · {{ item.code }}</span>
          </span>
          <icon-ant-design-enter-outlined class="icon mr-3px p-2px text-20px" />
        </div>
      </template>
    </div>
  </ElScrollbar>
</template>

<style lang="scss" scoped></style>
