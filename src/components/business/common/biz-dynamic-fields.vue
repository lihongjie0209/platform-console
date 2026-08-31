<script setup lang="ts" generic="Item extends Record<string, any>">
import { computed } from 'vue';
import { canAddBizDynamicField, canRemoveBizDynamicField } from './biz-dynamic-fields';

defineOptions({ name: 'BizDynamicFields' });

interface Props {
  createItem: () => Item;
  min?: number;
  max?: number;
  addText?: string;
  removeText?: string;
  disabled?: boolean;
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: Number.POSITIVE_INFINITY,
  addText: '添加一项',
  removeText: '删除',
  disabled: false,
  emptyText: '暂无数据'
});
const items = defineModel<Item[]>({ default: () => [] });
const canAdd = computed(() => !props.disabled && canAddBizDynamicField(items.value.length, props.max));

function add() {
  if (!canAdd.value) return;
  items.value = [...items.value, props.createItem()];
}

function remove(index: number) {
  if (props.disabled || !canRemoveBizDynamicField(items.value.length, props.min)) return;
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index);
}
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <BizEmptyState v-if="!items.length" :description="emptyText" />
    <div v-for="(item, index) in items" :key="index" class="flex items-start gap-12px">
      <div class="min-w-0 flex-1"><slot :item="item" :index="index" :remove="() => remove(index)" /></div>
      <ElButton
        text
        type="danger"
        :disabled="disabled || !canRemoveBizDynamicField(items.length, min)"
        @click="remove(index)"
      >
        {{ removeText }}
      </ElButton>
    </div>
    <div>
      <ElButton plain :disabled="!canAdd" @click="add">{{ addText }}</ElButton>
    </div>
  </div>
</template>
