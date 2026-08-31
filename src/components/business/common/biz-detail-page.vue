<script setup lang="ts">
defineOptions({ name: 'BizDetailPage' });

interface Props {
  title: string;
  description?: string;
  loading?: boolean;
  showBack?: boolean;
}

withDefaults(defineProps<Props>(), { description: '', loading: false, showBack: true });
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <ElCard v-loading="loading" class="card-wrapper">
      <div class="flex items-start justify-between gap-16px lt-sm:flex-col">
        <div class="flex items-start gap-12px">
          <ElButton v-if="showBack" text circle @click="emit('back')">
            <template #icon><icon-mdi-arrow-left /></template>
          </ElButton>
          <div class="min-w-0">
            <p class="m-0">{{ title }}</p>
            <p v-if="description" class="mb-0 mt-4px text-13px text-gray-500 leading-20px">{{ description }}</p>
          </div>
        </div>
        <ElSpace v-if="$slots.actions" class="shrink-0"><slot name="actions" /></ElSpace>
      </div>
      <div v-if="$slots.summary" class="mt-16px"><slot name="summary" /></div>
    </ElCard>
    <ElCard v-loading="loading" class="card-wrapper"><slot /></ElCard>
  </div>
</template>
