<script setup lang="ts">
import { $t } from '@/locales';
import BizCrudForm from './biz-crud-form.vue';
import type { BizFormField } from './types';

defineOptions({ name: 'BizSearchForm' });

interface Props {
  fields: BizFormField<any>[];
  loading?: boolean;
  collapsible?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  collapsible: true
});

const emit = defineEmits<{
  reset: [];
  search: [];
}>();

const model = defineModel<Record<string, any>>({ required: true });
</script>

<template>
  <ElCard v-if="fields.length" class="biz-search-card card-wrapper">
    <ElCollapse v-if="collapsible" model-value="search">
      <ElCollapseItem :title="$t('common.search')" name="search">
        <BizCrudForm v-model="model" :fields="fields" label-position="right" :label-width="88">
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}" />
          </template>
        </BizCrudForm>
        <div class="flex justify-end gap-12px">
          <ElButton :disabled="loading" @click="emit('reset')">
            <template #icon><icon-ic-round-refresh class="text-icon" /></template>
            {{ $t('common.reset') }}
          </ElButton>
          <ElButton type="primary" plain :loading="loading" @click="emit('search')">
            <template #icon><icon-ic-round-search class="text-icon" /></template>
            {{ $t('common.search') }}
          </ElButton>
        </div>
      </ElCollapseItem>
    </ElCollapse>
  </ElCard>
</template>

<style scoped>
.biz-search-card :deep(.el-card__body) {
  padding-top: 4px;
}
</style>
