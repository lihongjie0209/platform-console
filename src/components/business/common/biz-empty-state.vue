<script setup lang="ts">
defineOptions({ name: 'BizEmptyState' });

interface Props {
  title?: string;
  description?: string;
  imageSize?: number;
  actionText?: string;
}

withDefaults(defineProps<Props>(), { title: '', description: '', imageSize: 96, actionText: '' });
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <ElEmpty :image-size="imageSize" :description="title || $t('common.noData')">
    <p v-if="description" class="mb-16px mt--8px text-13px text-gray-500">{{ description }}</p>
    <slot>
      <ElButton v-if="actionText" type="primary" plain @click="emit('action')">{{ actionText }}</ElButton>
    </slot>
  </ElEmpty>
</template>
