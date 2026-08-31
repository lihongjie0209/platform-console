<script setup lang="ts">
defineOptions({ name: 'BizFormPage' });

interface Props {
  title: string;
  submitting?: boolean;
}

withDefaults(defineProps<Props>(), { submitting: false });
const emit = defineEmits<{ submit: []; cancel: [] }>();
</script>

<template>
  <ElCard class="biz-form-page card-wrapper">
    <template #header>
      <div class="flex items-center justify-between gap-16px">
        <p>{{ title }}</p>
        <ElSpace>
          <ElButton :disabled="submitting" @click="emit('cancel')">{{ $t('common.cancel') }}</ElButton>
          <ElButton type="primary" :loading="submitting" @click="emit('submit')">{{ $t('common.confirm') }}</ElButton>
        </ElSpace>
      </div>
    </template>
    <div class="mx-auto max-w-960px"><slot /></div>
  </ElCard>
</template>

<style scoped>
.biz-form-page {
  min-height: 420px;
}
</style>
