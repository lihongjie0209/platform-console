<script setup lang="ts">
import { computed, ref } from 'vue';
import { fetchGetAllPages, fetchGetMenuTree } from '@/service/api';
import { BizTreeCheckDialog } from '@/components/business/common';
import { $t } from '@/locales';

defineOptions({ name: 'MenuAuthModal' });
const props = defineProps<{ roleId: number }>();
const visible = defineModel<boolean>('visible', { default: false });
const title = computed(() => $t('common.edit') + $t('page.manage.role.menuAuth'));
const home = ref('');
const pages = ref<string[]>([]);

async function loadTree() {
  const [{ error, data }, pageResult] = await Promise.all([fetchGetMenuTree(), fetchGetAllPages()]);
  if (error) throw error;
  if (!pageResult.error) pages.value = pageResult.data;
  home.value = 'home';
  return data;
}

async function loadChecked() {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
}

async function submit(checked: number[], halfChecked: number[]) {
  // eslint-disable-next-line no-console
  console.info({ roleId: props.roleId, home: home.value, checked, halfChecked });
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
  >
    <div class="flex-y-center gap-16px pb-12px">
      <span>{{ $t('page.manage.menu.home') }}</span>
      <ElSelect v-model="home" size="small" class="w-160px">
        <ElOption v-for="page in pages" :key="page" :value="page" :label="page" />
      </ElSelect>
    </div>
  </BizTreeCheckDialog>
</template>
