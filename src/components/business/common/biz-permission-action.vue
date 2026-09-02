<script setup lang="ts">
import { computed } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import type { PermissionRequirement } from '@/platform/navigation';

defineOptions({ name: 'BizPermissionAction' });

interface Props {
  permission?: PermissionRequirement;
  unauthorized?: 'hide' | 'disable';
}

const props = withDefaults(defineProps<Props>(), { permission: undefined, unauthorized: 'hide' });
const platformStore = usePlatformStore();

const allowed = computed(() => platformStore.hasPermission(props.permission));
</script>

<template>
  <slot v-if="allowed || unauthorized === 'disable'" :allowed="allowed" :disabled="!allowed" />
</template>
