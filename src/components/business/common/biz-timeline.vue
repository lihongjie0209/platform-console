<script setup lang="ts">
import type { TimelineItemProps } from 'element-plus';

defineOptions({ name: 'BizTimeline' });

export interface BizTimelineItem {
  id: string | number;
  title: string;
  timestamp?: string;
  content?: string;
  type?: TimelineItemProps['type'];
  hollow?: boolean;
  slot?: string;
}

interface Props {
  items: BizTimelineItem[];
  reverse?: boolean;
}

withDefaults(defineProps<Props>(), { reverse: false });
</script>

<template>
  <ElTimeline :reverse="reverse">
    <ElTimelineItem
      v-for="item in items"
      :key="item.id"
      :timestamp="item.timestamp"
      :type="item.type"
      :hollow="item.hollow"
    >
      <slot v-if="item.slot" :name="`item-${item.slot}`" :item="item" />
      <template v-else>
        <p class="m-0">{{ item.title }}</p>
        <p v-if="item.content" class="mb-0 mt-4px text-13px text-gray-500">{{ item.content }}</p>
      </template>
    </ElTimelineItem>
  </ElTimeline>
</template>
