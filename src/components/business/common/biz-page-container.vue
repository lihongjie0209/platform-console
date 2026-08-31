<script setup lang="ts">
defineOptions({ name: 'BizPageContainer' });

interface Props {
  title?: string;
  description?: string;
  loading?: boolean;
  contentClass?: string;
}

withDefaults(defineProps<Props>(), { title: '', description: '', loading: false, contentClass: '' });
</script>

<template>
  <ElCard v-loading="loading" class="biz-page-container card-wrapper">
    <template v-if="title || description || $slots.actions" #header>
      <div class="flex items-start justify-between gap-16px lt-sm:flex-col">
        <div class="min-w-0">
          <p v-if="title" class="m-0">{{ title }}</p>
          <p v-if="description" class="mb-0 mt-4px text-13px text-gray-500 leading-20px">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="shrink-0"><slot name="actions" /></div>
      </div>
    </template>
    <div :class="contentClass"><slot /></div>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </ElCard>
</template>
