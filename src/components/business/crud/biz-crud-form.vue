<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import BizFieldControl from './biz-field-control.vue';
import type { BizCrudFormExpose, BizFormField } from './types';
import { resolveBizText } from './types';

defineOptions({ name: 'BizCrudForm' });

interface Props {
  fields: BizFormField<any>[];
  labelPosition?: 'left' | 'right' | 'top';
  labelWidth?: string | number;
  gutter?: number;
}

const props = withDefaults(defineProps<Props>(), {
  labelPosition: 'top',
  labelWidth: undefined,
  gutter: 20
});

const model = defineModel<Record<string, any>>({ required: true });
const formRef = ref<FormInstance | null>(null);

const visibleFields = computed(() => props.fields.filter(field => field.visible?.(model.value) ?? true));
const rules = computed<FormRules>(() =>
  Object.fromEntries(props.fields.filter(field => field.rules).map(field => [field.key, field.rules]))
);

async function validate() {
  if (!formRef.value) return true;

  try {
    await formRef.value.validate();
    return true;
  } catch {
    return false;
  }
}

function resetValidation() {
  formRef.value?.clearValidate();
}

defineExpose<BizCrudFormExpose>({ validate, resetValidation });
</script>

<template>
  <ElForm ref="formRef" :model="model" :rules="rules" :label-position="labelPosition" :label-width="labelWidth">
    <ElRow :gutter="gutter">
      <ElCol
        v-for="field in visibleFields"
        :key="field.key"
        :span="field.grid?.span ?? 24"
        :xs="field.grid?.xs"
        :sm="field.grid?.sm"
        :md="field.grid?.md"
        :lg="field.grid?.lg"
        :xl="field.grid?.xl"
      >
        <ElFormItem :label="resolveBizText(field.label)" :prop="field.key">
          <slot v-if="field.type === 'slot'" :name="`field-${field.slot || field.key}`" :field="field" :model="model" />
          <BizFieldControl v-else v-model="model[field.key]" :field="field" :model="model" />
        </ElFormItem>
      </ElCol>
    </ElRow>
  </ElForm>
</template>
