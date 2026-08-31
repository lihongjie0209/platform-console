<script setup lang="ts" generic="Node extends Record<string, any>, Key extends string | number">
import { nextTick, ref } from 'vue';
import type { TreeInstance } from 'element-plus';
import BizAsyncDialog from './biz-async-dialog.vue';

defineOptions({ name: 'BizTreeCheckDialog' });

interface Props {
  title: string;
  loadTree: () => Promise<Node[]>;
  loadChecked: () => Promise<Key[]>;
  submit: (checked: Key[], halfChecked: Key[]) => Promise<void>;
  nodeKey?: string;
  width?: string | number;
  treeProps?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), { nodeKey: 'id', width: 480, treeProps: () => ({}) });
const visible = defineModel<boolean>({ default: false });
const treeRef = ref<TreeInstance>();
const tree = ref<Node[]>([]);

async function initialize() {
  const [nodes, checked] = await Promise.all([props.loadTree(), props.loadChecked()]);
  tree.value = nodes;
  await nextTick();
  treeRef.value?.setCheckedKeys(checked);
}

async function handleSubmit() {
  const checked = treeRef.value?.getCheckedKeys(false) as Key[] | undefined;
  const halfChecked = treeRef.value?.getHalfCheckedKeys() as Key[] | undefined;
  await props.submit(checked || [], halfChecked || []);
}
</script>

<template>
  <BizAsyncDialog v-model="visible" :title="title" :width="width" :initialize="initialize" :submit="handleSubmit">
    <slot />
    <ElTree
      ref="treeRef"
      :data="tree"
      :node-key="nodeKey"
      :props="treeProps"
      show-checkbox
      class="h-280px overflow-y-auto"
    />
  </BizAsyncDialog>
</template>
