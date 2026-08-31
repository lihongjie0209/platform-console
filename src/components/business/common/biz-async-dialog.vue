<script setup lang="ts">
import { watch } from 'vue';
import { useAsyncAction } from './use-async-action';

defineOptions({ name: 'BizAsyncDialog' });

interface Props {
  title: string;
  width?: string | number;
  initialize?: () => Promise<unknown>;
  submit?: () => Promise<unknown>;
  successMessage?: string;
  destroyOnClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  width: 560,
  initialize: undefined,
  submit: undefined,
  successMessage: '',
  destroyOnClose: true
});
const emit = defineEmits<{ opened: []; success: [result: unknown]; error: [error: unknown]; closed: [] }>();
const visible = defineModel<boolean>({ default: false });
const { loading: initializing, run: runInitialize } = useAsyncAction<unknown>();
const { loading: submitting, run: runSubmit } = useAsyncAction<unknown>();

async function handleSubmit() {
  if (!props.submit) return;
  try {
    const result = await runSubmit(props.submit);
    if (props.successMessage) window.$message?.success(props.successMessage);
    emit('success', result);
    visible.value = false;
  } catch (error) {
    emit('error', error);
  }
}

watch(visible, async value => {
  if (!value) return;
  try {
    if (props.initialize) await runInitialize(props.initialize);
    emit('opened');
  } catch (error) {
    emit('error', error);
  }
});
</script>

<template>
  <ElDialog v-model="visible" :title="title" :width="width" :destroy-on-close="destroyOnClose" @closed="emit('closed')">
    <div v-loading="initializing"><slot :initializing="initializing" :submitting="submitting" /></div>
    <template #footer>
      <slot name="footer" :submitting="submitting" :submit="handleSubmit">
        <ElSpace>
          <ElButton :disabled="submitting" @click="visible = false">{{ $t('common.cancel') }}</ElButton>
          <ElButton v-if="submit" type="primary" :loading="submitting" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </ElButton>
        </ElSpace>
      </slot>
    </template>
  </ElDialog>
</template>
