<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { operationIdempotencyKey } from '@/platform/idempotency-key';
import type { Meter } from '../../api';
import { getMeter, listMeters, saveMeter } from '../../api';
defineOptions({ name: 'MeteringCenterMeters' });
const platformStore = usePlatformStore();
const canCreate = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'metering.meter.create' }));
const canRead = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'metering.meter.read' }));
const canUpdate = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'metering.meter.update' }));
const rows = ref<Meter[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const keyword = ref('');
const loading = ref(false);
const visible = ref(false);
const saving = ref(false);
const editing = ref<Meter>();
const loadGuard = createLatestRequestGuard();
const formKeys = new Map<string, string>();
const form = reactive({
  code: '',
  name: '',
  description: '',
  unit: '',
  aggregation: 'sum',
  dimensionKeys: '',
  status: 'active'
});
async function loadData() {
  const request = loadGuard.begin();
  loading.value = true;
  try {
    const v = await listMeters({
      status: status.value,
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value
    });
    if (loadGuard.isCurrent(request)) {
      rows.value = v.items || [];
      total.value = v.total || 0;
    }
  } finally {
    if (loadGuard.isCurrent(request)) loading.value = false;
  }
}
function search() {
  page.value = 1;
  loadData();
}
async function open(row?: Meter) {
  if ((row && (!canUpdate.value || !canRead.value)) || (!row && !canCreate.value)) return;
  const current = row ? await getMeter(row.id) : undefined;
  formKeys.clear();
  editing.value = current;
  Object.assign(
    form,
    current
      ? { ...current, dimensionKeys: current.dimension_keys.join(',') }
      : {
          code: '',
          name: '',
          description: '',
          unit: '',
          aggregation: 'sum',
          dimensionKeys: '',
          status: 'active'
        }
  );
  visible.value = true;
}
async function save() {
  if (saving.value || (editing.value && !canUpdate.value) || (!editing.value && !canCreate.value)) return;
  const dimensionKeys = form.dimensionKeys
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  const operation = JSON.stringify([
    'meter',
    editing.value?.id || '',
    editing.value?.version || 0,
    form,
    dimensionKeys
  ]);
  saving.value = true;
  try {
    await saveMeter(editing.value, {
      ...form,
      dimensionKeys,
      idempotencyKey: operationIdempotencyKey(formKeys, operation)
    });
    formKeys.clear();
    visible.value = false;
    await loadData();
  } finally {
    saving.value = false;
  }
}
onMounted(loadData);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">平台计量器目录</h2>
          <p class="mb-0 text-#999">定义用量单位、聚合方式与可用维度。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" @click="open()">新建计量项</ElButton>
      </div>
    </template>
    <ElForm inline>
      <ElFormItem label="搜索"><ElInput v-model="keyword" clearable /></ElFormItem>
      <ElFormItem label="状态">
        <ElSelect v-model="status" clearable class="w-140px">
          <ElOption label="active" value="active" />
          <ElOption label="disabled" value="disabled" />
        </ElSelect>
      </ElFormItem>
      <ElButton type="primary" @click="search">查询</ElButton>
    </ElForm>
    <ElTable v-loading="loading" :data="rows" border>
      <ElTableColumn prop="code" label="编码" />
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="unit" label="单位" />
      <ElTableColumn prop="aggregation" label="聚合" />
      <ElTableColumn prop="status" label="状态" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton v-if="canUpdate && canRead" link type="primary" @click="open(row)">编辑</ElButton>
          <span v-else>-</span>
        </template>
      </ElTableColumn>
    </ElTable>
    <ElPagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      class="mt-16px justify-end"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="loadData"
      @size-change="search"
    />
  </ElCard>
  <ElDialog v-model="visible" :title="editing ? '编辑计量项' : '新建计量项'">
    <ElForm label-width="100px">
      <ElFormItem label="编码"><ElInput v-model="form.code" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="说明"><ElInput v-model="form.description" /></ElFormItem>
      <ElFormItem label="单位"><ElInput v-model="form.unit" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="聚合">
        <ElSelect v-model="form.aggregation" :disabled="Boolean(editing)">
          <ElOption v-for="v in ['sum', 'max', 'last']" :key="v" :label="v" :value="v" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="维度">
        <ElInput v-model="form.dimensionKeys" placeholder="逗号分隔" :disabled="Boolean(editing)" />
      </ElFormItem>
      <ElFormItem v-if="editing" label="状态">
        <ElSelect v-model="form.status">
          <ElOption label="active" value="active" />
          <ElOption label="disabled" value="disabled" />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="editing ? canUpdate : canCreate" type="primary" :loading="saving" @click="save">保存</ElButton>
    </template>
  </ElDialog>
</template>
