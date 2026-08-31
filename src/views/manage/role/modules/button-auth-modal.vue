<script setup lang="ts">
import { computed } from 'vue';
import { BizTreeCheckDialog } from '@/components/business/common';
import { $t } from '@/locales';

defineOptions({ name: 'ButtonAuthModal' });
type ButtonConfig = { id: number; label: string; code: string };
const props = defineProps<{ roleId: number }>();
const visible = defineModel<boolean>('visible', { default: false });
const title = computed(() => $t('common.edit') + $t('page.manage.role.buttonAuth'));

async function loadTree(): Promise<ButtonConfig[]> {
  return Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    label: `button${index + 1}`,
    code: `code${index + 1}`
  }));
}

async function loadChecked() {
  return [1, 2, 3, 4, 5];
}

async function submit(checked: number[], halfChecked: number[]) {
  // eslint-disable-next-line no-console
  console.info({ roleId: props.roleId, checked, halfChecked });
  window.$message?.success?.($t('common.modifySuccess'));
}
</script>

<template>
  <BizTreeCheckDialog
    v-model="visible"
    :title="title"
    :load-tree="loadTree"
    :load-checked="loadChecked"
    :submit="submit"
  />
</template>
