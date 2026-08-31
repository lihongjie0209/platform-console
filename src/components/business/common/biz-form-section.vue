<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'BizFormSection' });

interface Props {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), { description: '', collapsible: false, defaultCollapsed: false });
const collapsed = defineModel<boolean>('collapsed', { default: undefined });
const isCollapsed = computed(() => collapsed.value ?? props.defaultCollapsed);

function toggle() {
  if (props.collapsible) collapsed.value = !isCollapsed.value;
}
</script>

<template>
  <ElCard class="card-wrapper">
    <template #header>
      <div class="flex items-center justify-between gap-12px">
        <div>
          <p class="m-0">{{ title }}</p>
          <p v-if="description" class="mb-0 mt-4px text-13px text-gray-500">{{ description }}</p>
        </div>
        <ElButton v-if="collapsible" text @click="toggle">
          {{ isCollapsed ? '展开' : '收起' }}
          <template #icon><icon-mdi-chevron-down :class="{ 'rotate-180': !isCollapsed }" /></template>
        </ElButton>
      </div>
    </template>
    <div v-show="!isCollapsed"><slot /></div>
  </ElCard>
</template>
