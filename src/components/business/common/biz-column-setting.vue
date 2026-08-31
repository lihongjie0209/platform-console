<script setup lang="ts">
import TableColumnSetting from '@/components/advanced/table-column-setting.vue';

defineOptions({ name: 'BizColumnSetting' });
const columns = defineModel<UI.TableColumnCheck[]>('columns', { required: true });
</script>

<template><TableColumnSetting v-model:columns="columns" /></template>
