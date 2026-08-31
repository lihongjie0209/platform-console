<script setup lang="ts">
import type { ImageProps } from 'element-plus';

defineOptions({ name: 'BizImagePreview' });

interface Props {
  src?: string;
  alt?: string;
  previewList?: string[];
  fit?: ImageProps['fit'];
  width?: string | number;
  height?: string | number;
}

withDefaults(defineProps<Props>(), {
  src: '',
  alt: '',
  previewList: () => [],
  fit: 'cover',
  width: 96,
  height: 96
});
</script>

<template>
  <ElImage
    v-if="src"
    :src="src"
    :alt="alt"
    :fit="fit"
    :style="{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    }"
    :preview-src-list="previewList.length ? previewList : [src]"
    preview-teleported
  >
    <template #error><BizEmptyState description="图片加载失败" /></template>
  </ElImage>
  <BizEmptyState v-else description="暂无图片" />
</template>
