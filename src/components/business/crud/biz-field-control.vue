<script setup lang="ts">
import { computed, toValue } from 'vue';
import type { BizFormField } from './types';

defineOptions({ name: 'BizFieldControl' });

interface Props {
  field: BizFormField;
  model: Record<string, any>;
}

const props = defineProps<Props>();

const value = defineModel<any>({ required: true });

const fieldType = computed(() => props.field.type || 'input');
const options = computed(() => (props.field.options ? toValue(props.field.options) : []));
const disabled = computed(() => {
  const fieldDisabled = props.field.disabled;
  return typeof fieldDisabled === 'function' ? fieldDisabled(props.model) : fieldDisabled;
});
const placeholder = computed(() => {
  const fieldPlaceholder = props.field.placeholder;
  return typeof fieldPlaceholder === 'function' ? fieldPlaceholder() : fieldPlaceholder;
});
</script>

<template>
  <ElInput
    v-if="fieldType === 'input' || fieldType === 'textarea'"
    v-model="value"
    :type="fieldType === 'textarea' ? 'textarea' : 'text'"
    :disabled="disabled"
    :placeholder="placeholder"
    v-bind="field.props"
  />
  <ElInputNumber
    v-else-if="fieldType === 'number'"
    v-model="value as number"
    :disabled="disabled"
    v-bind="field.props"
  />
  <ElSelect
    v-else-if="fieldType === 'select'"
    v-model="value"
    class="w-full"
    :disabled="disabled"
    :placeholder="placeholder"
    v-bind="field.props"
  >
    <ElOption
      v-for="option in options"
      :key="String(option.value)"
      :label="option.label"
      :value="option.value"
      :disabled="option.disabled"
    />
  </ElSelect>
  <ElRadioGroup v-else-if="fieldType === 'radio'" v-model="value" :disabled="disabled" v-bind="field.props">
    <ElRadio v-for="option in options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">
      {{ option.label }}
    </ElRadio>
  </ElRadioGroup>
  <ElCheckboxGroup
    v-else-if="fieldType === 'checkbox'"
    v-model="value as any[]"
    :disabled="disabled"
    v-bind="field.props"
  >
    <ElCheckbox v-for="option in options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">
      {{ option.label }}
    </ElCheckbox>
  </ElCheckboxGroup>
  <ElSwitch v-else-if="fieldType === 'switch'" v-model="value as any" :disabled="disabled" v-bind="field.props" />
  <ElDatePicker
    v-else-if="fieldType === 'date' || fieldType === 'date-range'"
    v-model="value as any"
    class="w-full"
    :type="fieldType === 'date-range' ? 'daterange' : 'date'"
    :disabled="disabled"
    v-bind="field.props"
  />
</template>
