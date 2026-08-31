<script setup lang="ts">
import type { TagProps } from 'element-plus';

defineOptions({ name: 'BizStatusTag' });

interface Props {
  label: string;
  type?: TagProps['type'];
}

withDefaults(defineProps<Props>(), { type: 'info' });
</script>

<template>
  <ElTag :type="type" effect="light">{{ label }}</ElTag>
</template>
