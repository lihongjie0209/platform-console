<script lang="ts" setup>
import { computed, ref, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { onKeyStroke, useDebounceFn } from '@vueuse/core';
import type { InputInstance } from 'element-plus';
import { useRouteStore } from '@/store/modules/route';
import { useAppStore } from '@/store/modules/app';
import { usePlatformStore } from '@/store/modules/platform';
import { $t } from '@/locales';
import { searchApplicationNavigation } from '@/platform/application-search';
import type { ApplicationSearchResult } from '@/platform/application-search';
import { applicationEntryDecision } from '@/platform/navigation';
import { switchApplicationContext } from '@/platform/application-switch';
import SearchResult from './search-result.vue';
import SearchFooter from './search-footer.vue';

defineOptions({ name: 'SearchModal' });

const router = useRouter();
const appStore = useAppStore();
const routeStore = useRouteStore();
const platformStore = usePlatformStore();

const isMobile = computed(() => appStore.isMobile);

const keyword = ref('');
const activeKey = ref('');
const resultOptions = shallowRef<ApplicationSearchResult[]>([]);

const handleSearch = useDebounceFn(search, 300);

const visible = defineModel<boolean>('show', { required: true });

const searchInput = ref<InputInstance>();

function search() {
  resultOptions.value = searchApplicationNavigation({
    navigations: platformStore.navigations,
    keyword: keyword.value,
    selectedApplicationId: platformStore.selectedApplicationId
  });
  activeKey.value = resultOptions.value[0]?.key ?? '';
}

function handleClose() {
  // handle with setTimeout to prevent user from seeing some operations
  setTimeout(() => {
    visible.value = false;
    resultOptions.value = [];
    keyword.value = '';
  }, 200);
}

/** key up */
function handleUp() {
  const { length } = resultOptions.value;
  if (length === 0) return;

  const index = getActivePathIndex();
  if (index === -1) return;

  const activeIndex = index === 0 ? length - 1 : index - 1;

  activeKey.value = resultOptions.value[activeIndex].key;
}

/** key down */
function handleDown() {
  const { length } = resultOptions.value;
  if (length === 0) return;

  const index = getActivePathIndex();
  if (index === -1) return;

  const activeIndex = index === length - 1 ? 0 : index + 1;

  activeKey.value = resultOptions.value[activeIndex].key;
}

function getActivePathIndex() {
  return resultOptions.value.findIndex(item => item.key === activeKey.value);
}

/** key enter */
async function handleEnter() {
  const result = resultOptions.value.find(item => item.key === activeKey.value);
  if (!result) return;
  const navigation = platformStore.navigations.find(item => item.application.id === result.applicationId);
  try {
    await switchApplicationContext(result.applicationId, applicationEntryDecision(navigation), {
      selectApplication: platformStore.selectApplication,
      refreshRoutes: routeStore.refreshPlatformRoutes,
      entryPathForApplication: platformStore.entryPathForApplication,
      navigate: path => router.push(path),
      targetPath: result.routePath
    });
    handleClose();
  } catch (error) {
    window.$message?.error(error instanceof Error ? error.message : '无法打开搜索结果');
  }
}

function registerShortcut() {
  onKeyStroke('Escape', handleClose);
  onKeyStroke('Enter', handleEnter);
  onKeyStroke('ArrowUp', handleUp);
  onKeyStroke('ArrowDown', handleDown);
}

/** open dialog and set input focus */
function setFocus() {
  setTimeout(() => {
    searchInput.value?.focus();
  });
}

registerShortcut();
</script>

<template>
  <ElDialog
    v-model="visible"
    :show-close="false"
    append-to-body
    class="search-modal fixed left-0 right-0"
    :class="[isMobile ? 'size-full top-0px rounded-0' : 'w-630px top-50px']"
    @open-auto-focus="setFocus"
    @close="handleClose"
  >
    <ElInput
      ref="searchInput"
      v-model="keyword"
      clearable
      :placeholder="$t('common.keywordSearch')"
      @input="handleSearch"
    >
      <template #prefix>
        <icon-uil-search class="text-15px" />
      </template>
      <template v-if="isMobile" #append>
        <ElButton type="primary" plain @click="handleClose">{{ $t('common.cancel') }}</ElButton>
      </template>
    </ElInput>

    <div>
      <ElEmpty v-if="resultOptions.length === 0" :description="$t('common.noData')" :image-size="50" />
      <SearchResult v-else v-model:active-key="activeKey" :options="resultOptions" @enter="handleEnter" />
    </div>
    <template #footer>
      <SearchFooter v-if="!isMobile" />
    </template>
  </ElDialog>
</template>

<style lang="scss">
.search-modal {
  .el-dialog__header {
    display: none;
  }
  .el-dialog__body {
    padding: 10px 15px 0;
  }
  .el-dialog__footer {
    border-top-width: 1px;
  }
}
</style>
