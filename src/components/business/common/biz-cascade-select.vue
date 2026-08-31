<script setup lang="ts">
defineOptions({ name: 'BizCascadeSelect' });

interface Props {
  options: Record<string, any>[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  props?: Record<string, any>;
}

withDefaults(defineProps<Props>(), { placeholder: '请选择', clearable: true, disabled: false, props: undefined });
const model = defineModel<string | number | (string | number)[] | undefined>();
</script>

<template>
  <ElCascader
    v-model="model"
    :options="options"
    :props="props"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    class="w-full"
  />
</template>
