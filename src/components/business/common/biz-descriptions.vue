<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'BizDescriptions' });

export interface BizDescriptionItem<Data extends Record<string, any> = Record<string, any>> {
  key: Extract<keyof Data, string> | (string & {});
  label: string;
  span?: number;
  width?: string | number;
  slot?: string;
  formatter?: (value: unknown, data: Data) => string | number | null | undefined;
  visible?: (data: Data) => boolean;
}

interface Props {
  data: Record<string, any>;
  items: BizDescriptionItem[];
  columns?: number;
  border?: boolean;
  emptyText?: string;
  direction?: 'horizontal' | 'vertical';
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
  border: true,
  emptyText: '--',
  direction: 'horizontal'
});

const visibleItems = computed(() => props.items.filter(item => item.visible?.(props.data) ?? true));

function displayValue(item: BizDescriptionItem) {
  const value = props.data[item.key];
  const formatted = item.formatter?.(value, props.data) ?? value;
  return formatted === null || formatted === undefined || formatted === '' ? props.emptyText : formatted;
}
</script>

<template>
  <ElDescriptions :column="columns" :border="border" :direction="direction">
    <ElDescriptionsItem
      v-for="item in visibleItems"
      :key="item.key"
      :label="item.label"
      :span="item.span"
      :width="item.width"
    >
      <slot v-if="item.slot" :name="`item-${item.slot}`" :item="item" :data="data" :value="data[item.key]" />
      <template v-else>{{ displayValue(item) }}</template>
    </ElDescriptionsItem>
  </ElDescriptions>
</template>
