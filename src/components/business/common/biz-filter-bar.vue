<script setup lang="ts">
import { computed, reactive } from 'vue';
import { jsonClone } from '@sa/utils';
import type { BizFormField } from '../crud';
import BizFieldControl from '../crud/biz-field-control.vue';
import { resolveBizText } from '../crud/types';

defineOptions({ name: 'BizFilterBar' });

interface Preset<Model> {
  label: string;
  value: Model;
}

interface Props {
  fields: BizFormField[];
  defaultValue: Record<string, any>;
  presets?: Preset<Record<string, any>>[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), { presets: () => [], loading: false });
const model = defineModel<Record<string, any>>({ required: true });
const presetValue = reactive<{ index?: number }>({});
const visibleFields = computed(() => props.fields.filter(field => field.visible?.(model.value) ?? true));
const emit = defineEmits<{
  search: [value: Record<string, any>];
  reset: [value: Record<string, any>];
  preset: [value: Record<string, any>];
}>();

function reset() {
  Object.assign(model.value, jsonClone(props.defaultValue));
  emit('reset', model.value);
}

function applyPreset(index: number) {
  const preset = props.presets[index];
  if (!preset) return;
  Object.assign(model.value, jsonClone(preset.value));
  emit('preset', model.value);
  emit('search', model.value);
}
</script>

<template>
  <ElCard class="card-wrapper">
    <ElForm :model="model" label-position="top">
      <ElRow :gutter="20">
        <ElCol v-for="field in visibleFields" :key="field.key" :span="field.grid?.span ?? 24" :md="field.grid?.md ?? 8">
          <ElFormItem :label="resolveBizText(field.label)">
            <BizFieldControl v-model="model[field.key]" :field="field" :model="model" />
          </ElFormItem>
        </ElCol>
      </ElRow>
      <div class="flex flex-wrap items-center justify-between gap-12px">
        <ElSelect
          v-if="presets.length"
          v-model="presetValue.index"
          placeholder="常用筛选"
          class="w-180px"
          @change="applyPreset"
        >
          <ElOption v-for="(preset, index) in presets" :key="preset.label" :label="preset.label" :value="index" />
        </ElSelect>
        <ElSpace class="ml-auto">
          <ElButton :disabled="loading" @click="reset">{{ $t('common.reset') }}</ElButton>
          <ElButton type="primary" :loading="loading" @click="emit('search', model)">
            {{ $t('common.search') }}
          </ElButton>
        </ElSpace>
      </div>
    </ElForm>
  </ElCard>
</template>
