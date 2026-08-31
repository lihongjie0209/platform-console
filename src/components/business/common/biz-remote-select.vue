<script setup lang="ts" generic="Value extends string | number">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import type { BizRemoteLoadResult, BizRemoteOption } from './biz-remote-select';
import { mergeBizRemoteOptions } from './biz-remote-select';

defineOptions({ name: 'BizRemoteSelect' });

interface Props {
  loader: (keyword: string, page: number, pageSize: number) => Promise<BizRemoteLoadResult<Value>>;
  resolver?: (values: Value[]) => Promise<BizRemoteOption<Value>[]>;
  multiple?: boolean;
  pageSize?: number;
  debounce?: number;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  pageSize: 20,
  debounce: 300,
  placeholder: '',
  clearable: true,
  disabled: false,
  resolver: undefined
});

const model = defineModel<Value | Value[] | undefined>();
const options = shallowRef<BizRemoteOption<Value>[]>([]);
const loading = ref(false);
const keyword = ref('');
const page = ref(1);
const hasMore = ref(false);
let requestId = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const selectedValues = computed<Value[]>(() => {
  if (Array.isArray(model.value)) return model.value;
  return model.value === undefined || model.value === null ? [] : [model.value];
});

async function load(reset = false) {
  requestId += 1;
  const currentRequest = requestId;
  const nextPage = reset ? 1 : page.value;
  loading.value = true;
  try {
    const result = await props.loader(keyword.value, nextPage, props.pageSize);
    if (currentRequest !== requestId) return;
    options.value = mergeBizRemoteOptions(
      reset ? options.value.filter(item => selectedValues.value.includes(item.value)) : options.value,
      result.items
    );
    page.value = nextPage + 1;
    hasMore.value =
      result.hasMore ??
      (result.total !== undefined ? options.value.length < result.total : result.items.length === props.pageSize);
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

function remoteMethod(value: string) {
  keyword.value = value;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => load(true), props.debounce);
}

async function resolveSelected(values: Value[]) {
  if (!props.resolver) return;
  const missing = values.filter(value => !options.value.some(item => item.value === value));
  if (missing.length) options.value = mergeBizRemoteOptions(options.value, await props.resolver(missing));
}

watch(selectedValues, resolveSelected, { immediate: true });
onMounted(() => load(true));
</script>

<template>
  <ElSelect
    v-model="model"
    filterable
    remote
    reserve-keyword
    :remote-method="remoteMethod"
    :loading="loading"
    :multiple="multiple"
    :placeholder="placeholder"
    :clearable="clearable"
    :disabled="disabled"
    class="w-full"
  >
    <ElOption
      v-for="option in options"
      :key="option.value"
      :label="option.label"
      :value="option.value"
      :disabled="option.disabled"
    />
    <template v-if="hasMore" #footer>
      <ElButton text :loading="loading" class="w-full" @click="load()">加载更多</ElButton>
    </template>
  </ElSelect>
</template>
