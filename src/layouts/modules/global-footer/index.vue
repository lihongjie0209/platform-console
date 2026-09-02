<script setup lang="ts">
import { consoleBuildInfo, formatConsoleBuild } from '@/platform/build-info';

defineOptions({
  name: 'GlobalFooter'
});
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <span title="构建时间">Platform Console {{ formatConsoleBuild(consoleBuildInfo) }}</span>
  </DarkModeContainer>
</template>

<style scoped></style>
