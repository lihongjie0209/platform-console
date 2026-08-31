<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineOptions({ name: 'BizLink' });

interface Props {
  to?: RouteLocationRaw;
  href?: string;
  disabled?: boolean;
  external?: boolean;
}

withDefaults(defineProps<Props>(), { to: undefined, href: '', disabled: false, external: false });
</script>

<template>
  <span v-if="disabled" class="cursor-not-allowed text-gray-400"><slot /></span>
  <RouterLink v-else-if="to" :to="to" class="text-primary no-underline hover:underline"><slot /></RouterLink>
  <ElLink
    v-else
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    type="primary"
  >
    <slot />
  </ElLink>
</template>
