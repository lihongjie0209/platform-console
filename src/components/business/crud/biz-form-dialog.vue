<script setup lang="ts">
defineOptions({ name: 'BizFormDialog' });

interface Props {
  title: string;
  width?: string | number;
  submitting?: boolean;
}

withDefaults(defineProps<Props>(), { width: 560, submitting: false });

const emit = defineEmits<{ submit: []; cancel: [] }>();
const visible = defineModel<boolean>({ default: false });
</script>

<template>
  <ElDialog v-model="visible" :title="title" :width="width" destroy-on-close @closed="emit('cancel')">
    <slot />
    <template #footer>
      <ElSpace :size="12">
        <ElButton :disabled="submitting" @click="visible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="emit('submit')">{{ $t('common.confirm') }}</ElButton>
      </ElSpace>
    </template>
  </ElDialog>
</template>
