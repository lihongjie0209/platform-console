<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard } from '@/platform/application-context';
import { parseJSONArray, parseJSONObject } from '@/platform/json';
import { confirmUserAction } from '@/platform/user-action';
import type { Plan, UsagePrice } from '../../api';
import { deleteUsagePrice, getPlan, listPlans, savePlan, upsertUsagePrice } from '../../api';
defineOptions({ name: 'BillingCenterPlans' });
const platformStore = usePlatformStore();
const canCreate = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'billing.plan.create' }));
const canUpdate = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'billing.plan.update' }));
const canRead = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'billing.plan.read' }));
const canDelete = computed(() => platformStore.hasPermission({ scope: 'platform', codes: 'billing.plan.delete' }));
const rows = ref<Plan[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const keyword = ref('');
const visible = ref(false);
const editing = ref<Plan>();
const priceVisible = ref(false);
const prices = ref<UsagePrice[]>([]);
const selected = ref<Plan>();
const loadGuard = createLatestRequestGuard();
const detailGuard = createLatestRequestGuard();
const form = reactive({
  code: '',
  name: '',
  description: '',
  currency: 'CNY',
  billing_interval: 'month',
  base_amount_minor: 0,
  trial_days: 0,
  status: 'active',
  entitlements: '{}'
});
const price = reactive({
  id: '',
  meter_code: '',
  included_quantity: 0,
  unit_quantity: 1,
  unit_amount_minor: 0,
  pricing_model: 'unit',
  tiers: '[]',
  version: 0
});
async function load() {
  const request = loadGuard.begin();
  const v = await listPlans({
    status: status.value,
    keyword: keyword.value,
    page: page.value,
    pageSize: pageSize.value
  });
  if (loadGuard.isCurrent(request)) {
    rows.value = v.items || [];
    total.value = v.total || 0;
  }
}
function search() {
  page.value = 1;
  load();
}
async function open(v?: Plan) {
  if ((v && (!canUpdate.value || !canRead.value)) || (!v && !canCreate.value)) return;
  const current = v ? (await getPlan(v.id)).plan : undefined;
  editing.value = current;
  Object.assign(
    form,
    current
      ? { ...current, entitlements: JSON.stringify(current.entitlements_json, null, 2) }
      : {
          code: '',
          name: '',
          description: '',
          currency: 'CNY',
          billing_interval: 'month',
          base_amount_minor: 0,
          trial_days: 0,
          status: 'active',
          entitlements: '{}'
        }
  );
  visible.value = true;
}
async function save() {
  if ((editing.value && !canUpdate.value) || (!editing.value && !canCreate.value)) return;
  try {
    await savePlan(editing.value, {
      ...form,
      entitlements_json: parseJSONObject(form.entitlements, '权益')
    } as never);
    visible.value = false;
    await load();
  } catch (e) {
    window.$message?.error(e instanceof Error ? e.message : '保存失败');
  }
}
async function manage(v: Plan) {
  if (!canRead.value) return;
  const request = detailGuard.begin();
  selected.value = v;
  const detail = await getPlan(v.id);
  if (!detailGuard.isCurrent(request) || selected.value?.id !== v.id) return;
  prices.value = detail.usage_prices || [];
  priceVisible.value = true;
}
function editPrice(v?: UsagePrice) {
  if (!canUpdate.value) return;
  Object.assign(
    price,
    v
      ? { ...v, tiers: JSON.stringify(v.tiers_json, null, 2) }
      : {
          id: '',
          meter_code: '',
          included_quantity: 0,
          unit_quantity: 1,
          unit_amount_minor: 0,
          pricing_model: 'unit',
          tiers: '[]',
          version: 0
        }
  );
}
async function savePrice() {
  if (!canUpdate.value || !selected.value) return;
  await upsertUsagePrice({
    ...price,
    plan_id: selected.value.id,
    tiers_json: parseJSONArray(price.tiers, '阶梯')
  } as never);
  await manage(selected.value);
}
async function removePrice(v: UsagePrice) {
  if (!canDelete.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm(`确认删除计量项“${v.meter_code}”的用量价格吗？`, '删除用量价格', { type: 'warning' })
  );
  if (!confirmed) return;
  await deleteUsagePrice(v);
  if (selected.value) await manage(selected.value);
}
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">平台套餐与价格目录</h2>
          <p class="mb-0 text-#999">平台统一定义可供各应用订阅的套餐；金额使用最小货币单位，避免浮点误差。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" @click="open()">新建套餐</ElButton>
      </div>
    </template>
    <ElForm inline>
      <ElFormItem label="搜索"><ElInput v-model="keyword" /></ElFormItem>
      <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
      <ElButton @click="search">查询</ElButton>
    </ElForm>
    <ElTable :data="rows" border>
      <ElTableColumn prop="code" label="编码" />
      <ElTableColumn prop="name" label="名称" />
      <ElTableColumn prop="currency" label="币种" />
      <ElTableColumn prop="base_amount_minor" label="基础金额(分)" />
      <ElTableColumn prop="billing_interval" label="周期" />
      <ElTableColumn prop="status" label="状态" />
      <ElTableColumn label="操作" width="160">
        <template #default="{ row }">
          <ElButton v-if="canUpdate && canRead" link @click="open(row)">编辑</ElButton>
          <ElButton v-if="canRead" link @click="manage(row)">用量价格</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <div class="mt-16px flex justify-end">
      <ElPagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="load"
        @size-change="search"
      />
    </div>
  </ElCard>
  <ElDialog v-model="visible" :title="editing ? '编辑套餐' : '新建套餐'">
    <ElForm label-width="110px">
      <ElFormItem label="编码"><ElInput v-model="form.code" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="名称"><ElInput v-model="form.name" /></ElFormItem>
      <ElFormItem label="币种"><ElInput v-model="form.currency" :disabled="Boolean(editing)" /></ElFormItem>
      <ElFormItem label="计费周期">
        <ElSelect v-model="form.billing_interval" :disabled="Boolean(editing)">
          <ElOption label="month" value="month" />
          <ElOption label="year" value="year" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="基础金额(分)"><ElInputNumber v-model="form.base_amount_minor" :min="0" /></ElFormItem>
      <ElFormItem label="试用天数"><ElInputNumber v-model="form.trial_days" :min="0" /></ElFormItem>
      <ElFormItem label="权益 JSON"><ElInput v-model="form.entitlements" type="textarea" :rows="6" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton v-if="editing ? canUpdate : canCreate" type="primary" @click="save">保存</ElButton>
    </template>
  </ElDialog>
  <ElDrawer v-model="priceVisible" title="用量价格" size="700px">
    <ElForm inline>
      <ElFormItem label="计量编码"><ElInput v-model="price.meter_code" /></ElFormItem>
      <ElFormItem label="包含量"><ElInputNumber v-model="price.included_quantity" /></ElFormItem>
      <ElFormItem label="单位量"><ElInputNumber v-model="price.unit_quantity" :min="1" /></ElFormItem>
      <ElFormItem label="单位金额(分)"><ElInputNumber v-model="price.unit_amount_minor" /></ElFormItem>
      <ElFormItem label="模型"><ElInput v-model="price.pricing_model" /></ElFormItem>
      <ElFormItem label="阶梯 JSON"><ElInput v-model="price.tiers" /></ElFormItem>
      <ElButton v-if="canUpdate" type="primary" @click="savePrice">保存价格</ElButton>
    </ElForm>
    <ElTable :data="prices" border>
      <ElTableColumn prop="meter_code" label="计量项" />
      <ElTableColumn prop="pricing_model" label="模型" />
      <ElTableColumn prop="unit_amount_minor" label="单位金额" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton v-if="canUpdate" link @click="editPrice(row)">编辑</ElButton>
          <ElButton v-if="canDelete" link type="danger" @click="removePrice(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElDrawer>
</template>
