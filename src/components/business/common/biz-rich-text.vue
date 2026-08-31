<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import WangEditor from 'wangeditor';

defineOptions({ name: 'BizRichText' });

interface Props {
  height?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { height: 320, disabled: false });
const model = defineModel<string>({ default: '' });
const editorRoot = ref<HTMLElement>();
const editor = ref<WangEditor>();

function createEditor() {
  if (!editorRoot.value || editor.value) return;
  const instance = new WangEditor(editorRoot.value);
  instance.config.zIndex = 10;
  instance.config.onchange = (html: string) => {
    model.value = html;
  };
  instance.create();
  instance.txt.html(model.value);
  if (props.disabled) instance.disable();
  editor.value = instance;
}

watch(
  () => props.disabled,
  value => {
    if (value) editor.value?.disable();
    else editor.value?.enable();
  }
);
watch(model, value => {
  if (editor.value && editor.value.txt.html() !== value) editor.value.txt.html(value);
});
onMounted(() => nextTick(createEditor));
onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
  <div ref="editorRoot" :style="{ minHeight: `${height}px` }" class="biz-rich-text bg-white dark:bg-dark" />
</template>

<style scoped>
:deep(.w-e-toolbar) {
  background: inherit !important;
  border-color: var(--el-border-color) !important;
}
:deep(.w-e-text-container) {
  background: inherit;
  border-color: var(--el-border-color) !important;
}
</style>
