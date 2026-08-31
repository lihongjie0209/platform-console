<script setup lang="ts">
import TableColumnSetting from '@/components/advanced/table-column-setting.vue';
import { $t } from '@/locales';

defineOptions({ name: 'BizTableToolbar' });

interface Props {
  loading?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  showColumnSetting?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  canCreate: true,
  canDelete: false,
  showColumnSetting: true
});

const emit = defineEmits<{
  create: [];
  delete: [];
  refresh: [];
}>();

const columns = defineModel<UI.TableColumnCheck[]>('columns', { default: () => [] });
</script>

<template>
  <ElSpace wrap justify="end">
    <slot name="prefix" />
    <ElButton v-if="canCreate" plain type="primary" @click="emit('create')">
      <template #icon><icon-ic-round-plus class="text-icon" /></template>
      {{ $t('common.add') }}
    </ElButton>
    <ElPopconfirm v-if="canDelete" :title="$t('common.confirmDelete')" @confirm="emit('delete')">
      <template #reference>
        <ElButton type="danger" plain>
          <template #icon><icon-ic-round-delete class="text-icon" /></template>
          {{ $t('common.batchDelete') }}
        </ElButton>
      </template>
    </ElPopconfirm>
    <ElButton :disabled="loading" @click="emit('refresh')">
      <template #icon><icon-mdi-refresh class="text-icon" :class="{ 'animate-spin': loading }" /></template>
      {{ $t('common.refresh') }}
    </ElButton>
    <TableColumnSetting v-if="showColumnSetting" v-model:columns="columns" />
    <slot name="suffix" />
  </ElSpace>
</template>
