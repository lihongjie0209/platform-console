<script setup lang="ts">
import { computed } from 'vue';
import { findBizDictOption } from './biz-dict';
import type { BizDictOption } from './biz-dict';

defineOptions({ name: 'BizDictText' });

interface Props {
  value?: unknown;
  options: BizDictOption<any>[];
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), { value: undefined, emptyText: '--' });
const option = computed(() => findBizDictOption(props.options, props.value));
</script>

<template>
  <slot v-if="option" :option="option">{{ option.label }}</slot>
  <template v-else>{{ emptyText }}</template>
</template>
