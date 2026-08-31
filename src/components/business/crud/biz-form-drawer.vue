<script setup lang="ts">
defineOptions({ name: 'BizFormDrawer' });

interface Props {
  title: string;
  width?: string | number;
  submitting?: boolean;
}

withDefaults(defineProps<Props>(), { width: 420, submitting: false });

const emit = defineEmits<{ submit: []; cancel: [] }>();
const visible = defineModel<boolean>({ default: false });
</script>

<template>
  <ElDrawer v-model="visible" :title="title" :size="width" destroy-on-close @closed="emit('cancel')">
    <slot />
    <template #footer>
      <ElSpace :size="12">
        <ElButton :disabled="submitting" @click="visible = false">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="submitting" @click="emit('submit')">{{ $t('common.confirm') }}</ElButton>
      </ElSpace>
    </template>
  </ElDrawer>
</template>
