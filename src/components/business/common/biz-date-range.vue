<script setup lang="ts">
import type { DatePickerProps } from 'element-plus';

defineOptions({ name: 'BizDateRange' });

interface Props {
  placeholderStart?: string;
  placeholderEnd?: string;
  valueFormat?: string;
  disabled?: boolean;
  clearable?: boolean;
  shortcuts?: DatePickerProps['shortcuts'];
}

withDefaults(defineProps<Props>(), {
  placeholderStart: '开始日期',
  placeholderEnd: '结束日期',
  valueFormat: 'YYYY-MM-DD',
  disabled: false,
  clearable: true,
  shortcuts: () => []
});
const model = defineModel<[string, string] | undefined>();
</script>

<template>
  <ElDatePicker
    v-model="model"
    type="daterange"
    :start-placeholder="placeholderStart"
    :end-placeholder="placeholderEnd"
    :value-format="valueFormat"
    :disabled="disabled"
    :clearable="clearable"
    :shortcuts="shortcuts"
    class="w-full"
  />
</template>
