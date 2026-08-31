<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@/hooks/business/auth';

defineOptions({ name: 'BizPermissionAction' });

interface Props {
  auth?: string | string[];
  strategy?: 'any' | 'all';
  unauthorized?: 'hide' | 'disable';
}

const props = withDefaults(defineProps<Props>(), { auth: undefined, strategy: 'any', unauthorized: 'hide' });
const { hasAuth } = useAuth();

const allowed = computed(() => {
  if (!props.auth) return true;
  if (typeof props.auth === 'string') return hasAuth(props.auth);
  return props.strategy === 'all' ? props.auth.every(code => hasAuth(code)) : hasAuth(props.auth);
});
</script>

<template>
  <slot v-if="allowed || unauthorized === 'disable'" :allowed="allowed" :disabled="!allowed" />
</template>
