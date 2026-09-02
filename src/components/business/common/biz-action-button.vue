<script setup lang="ts">
import { computed } from 'vue';
import type { ButtonProps } from 'element-plus';
import { usePlatformStore } from '@/store/modules/platform';
import type { PermissionRequirement } from '@/platform/navigation';
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
  permission?: PermissionRequirement;
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
  permission: undefined,
  unauthorized: 'hide',
  successMessage: ''
});

const emit = defineEmits<{ success: [result: unknown]; error: [error: unknown] }>();
const platformStore = usePlatformStore();
const { loading, run } = useAsyncAction<unknown>();

const allowed = computed(() => platformStore.hasPermission(props.permission));
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
