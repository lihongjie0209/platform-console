<script setup lang="ts">
import { computed } from 'vue';
import { findBizDictOption } from './biz-dict';
import type { BizDictOption } from './biz-dict';

defineOptions({ name: 'BizDictTag' });

interface Props {
  value?: unknown;
  options: BizDictOption<any>[];
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), { value: undefined, emptyText: '--' });
const option = computed(() => findBizDictOption(props.options, props.value));
</script>

<template>
  <ElTag v-if="option" :type="option.tagType" effect="light">{{ option.label }}</ElTag>
  <template v-else>{{ emptyText }}</template>
</template>
