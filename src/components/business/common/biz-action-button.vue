<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonProps } from 'element-plus';
import { useAuth } from '@/hooks/business/auth';
import { useAsyncAction } from './use-async-action';

defineOptions({ name: 'BizActionButton' });

interface Props {
  label?: string;
  action: () => Promise<unknown>;
  type?: ButtonProps['type'];
  size?: ButtonProps['size'];
  plain?: boolean;
  disabled?: boolean;
  confirm?: string;
  auth?: string | string[];
  authStrategy?: 'any' | 'all';
  unauthorized?: 'hide' | 'disable';
  successMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  type: '',
  size: '',
  plain: false,
  disabled: false,
  confirm: '',
  auth: undefined,
  authStrategy: 'any',
  unauthorized: 'hide',
  successMessage: ''
});

const emit = defineEmits<{ success: [result: unknown]; error: [error: unknown] }>();
const { hasAuth } = useAuth();
const { loading, run } = useAsyncAction<unknown>();

const allowed = computed(() => {
  if (!props.auth) return true;
  if (typeof props.auth === 'string') return hasAuth(props.auth);
  return props.authStrategy === 'all' ? props.auth.every(code => hasAuth(code)) : hasAuth(props.auth);
});
const visible = computed(() => allowed.value || props.unauthorized !== 'hide');
const buttonDisabled = computed(() => props.disabled || !allowed.value);

async function execute() {
  try {
    const result = await run(props.action);
    if (result === undefined && loading.value) return;
    if (props.successMessage) window.$message?.success(props.successMessage);
    emit('success', result);
  } catch (error) {
    emit('error', error);
  }
}
</script>

<template>
  <template v-if="visible">
    <ElPopconfirm v-if="confirm" :title="confirm" @confirm="execute">
      <template #reference>
        <ElButton :type="type" :size="size" :plain="plain" :disabled="buttonDisabled" :loading="loading">
          <slot>{{ label }}</slot>
        </ElButton>
      </template>
    </ElPopconfirm>
    <ElButton
      v-else
      :type="type"
      :size="size"
      :plain="plain"
      :disabled="buttonDisabled"
      :loading="loading"
      @click="execute"
    >
      <slot>{{ label }}</slot>
    </ElButton>
  </template>
</template>
