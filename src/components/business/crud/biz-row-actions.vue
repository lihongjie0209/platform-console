<script setup lang="ts">
import { $t } from '@/locales';

defineOptions({ name: 'BizRowActions' });

interface Props {
  canEdit?: boolean;
  canDelete?: boolean;
  deleteConfirm?: string;
}

withDefaults(defineProps<Props>(), {
  canEdit: true,
  canDelete: true,
  deleteConfirm: undefined
});

const emit = defineEmits<{
  edit: [];
  delete: [];
}>();
</script>

<template>
  <div class="flex-center gap-8px">
    <slot name="prefix" />
    <ElButton v-if="canEdit" type="primary" plain size="small" @click="emit('edit')">
      {{ $t('common.edit') }}
    </ElButton>
    <ElPopconfirm v-if="canDelete" :title="deleteConfirm || $t('common.confirmDelete')" @confirm="emit('delete')">
      <template #reference>
        <ElButton type="danger" plain size="small">{{ $t('common.delete') }}</ElButton>
      </template>
    </ElPopconfirm>
    <slot name="suffix" />
  </div>
</template>
