<script setup lang="ts">
defineOptions({ name: 'BizBatchActionBar' });

interface Props {
  count: number;
  label?: string;
}

withDefaults(defineProps<Props>(), { label: '已选择' });
const emit = defineEmits<{ clear: [] }>();
</script>

<template>
  <ElAlert v-if="count > 0" type="info" :closable="false" show-icon>
    <template #title>
      <div class="flex-y-center justify-between gap-16px">
        <span>{{ label }} {{ count }} 项</span>
        <ElSpace>
          <slot />
          <ElButton text type="primary" @click="emit('clear')">{{ $t('common.cancel') }}</ElButton>
        </ElSpace>
      </div>
    </template>
  </ElAlert>
</template>
