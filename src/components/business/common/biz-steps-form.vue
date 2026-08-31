<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'BizStepsForm' });

export interface BizStepItem {
  title: string;
  description?: string;
  disabled?: boolean;
}

interface Props {
  steps: BizStepItem[];
  submitting?: boolean;
  nextText?: string;
  finishText?: string;
}

const props = withDefaults(defineProps<Props>(), { submitting: false, nextText: '下一步', finishText: '完成' });
const active = defineModel<number>('active', { default: 0 });
const emit = defineEmits<{ previous: [active: number]; next: [active: number]; finish: [] }>();
const isFirst = computed(() => active.value <= 0);
const isLast = computed(() => active.value >= props.steps.length - 1);

function previous() {
  if (isFirst.value) return;
  active.value -= 1;
  emit('previous', active.value);
}

function next() {
  if (isLast.value) {
    emit('finish');
    return;
  }
  active.value += 1;
  emit('next', active.value);
}
</script>

<template>
  <div class="flex-col-stretch gap-24px">
    <ElSteps :active="active" finish-status="success">
      <ElStep
        v-for="step in steps"
        :key="step.title"
        :title="step.title"
        :description="step.description"
        :disabled="step.disabled"
      />
    </ElSteps>
    <div><slot :active="active" :step="steps[active]" /></div>
    <div class="flex justify-end gap-12px">
      <ElButton v-if="!isFirst" :disabled="submitting" @click="previous">上一步</ElButton>
      <ElButton type="primary" :loading="submitting" @click="next">{{ isLast ? finishText : nextText }}</ElButton>
    </div>
  </div>
</template>
