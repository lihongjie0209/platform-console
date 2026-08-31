<script setup lang="ts">
import { ref } from 'vue';
import { useAsyncAction } from './use-async-action';

defineOptions({ name: 'BizCommentPanel' });

export interface BizComment {
  id: string | number;
  author: string;
  content: string;
  createdAt?: string;
  avatar?: string;
}

interface Props {
  submit: (content: string) => Promise<BizComment | undefined>;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入评论',
  disabled: false,
  emptyText: '暂无评论'
});
const comments = defineModel<BizComment[]>({ default: () => [] });
const emit = defineEmits<{ submitted: [comment: BizComment | undefined]; error: [error: unknown] }>();
const content = ref('');
const { loading, run } = useAsyncAction<BizComment | undefined>();

async function submitComment() {
  const value = content.value.trim();
  if (!value || props.disabled) return;
  try {
    const comment = await run(() => props.submit(value));
    if (comment) comments.value = [...comments.value, comment];
    content.value = '';
    emit('submitted', comment);
  } catch (error) {
    emit('error', error);
  }
}
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <ElInput
      v-model="content"
      type="textarea"
      :rows="3"
      :placeholder="placeholder"
      :disabled="disabled"
      maxlength="500"
      show-word-limit
    />
    <div class="flex justify-end">
      <ElButton type="primary" :loading="loading" :disabled="disabled || !content.trim()" @click="submitComment">
        发表评论
      </ElButton>
    </div>
    <BizEmptyState v-if="!comments.length" :description="emptyText" />
    <div
      v-for="comment in comments"
      :key="comment.id"
      class="border-b border-gray-200 pb-12px last:border-b-0 dark:border-dark-300"
    >
      <slot name="comment" :comment="comment">
        <div class="flex items-center gap-8px">
          <ElAvatar v-if="comment.avatar" :src="comment.avatar" :size="28" />
          <span>{{ comment.author }}</span>
          <span v-if="comment.createdAt" class="text-12px text-gray-500">{{ comment.createdAt }}</span>
        </div>
        <p class="mb-0 mt-8px whitespace-pre-wrap">{{ comment.content }}</p>
      </slot>
    </div>
  </div>
</template>
