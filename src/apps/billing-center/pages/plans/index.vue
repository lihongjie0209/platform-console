<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { Plan, UsagePrice } from '../../api';
import { deleteUsagePrice, getPlan, listPlans, savePlan, upsertUsagePrice } from '../../api';
import { parseJSONArray, parseJSONObject } from '../../../commerce/json';
defineOptions({ name: 'BillingCenterPlans' });
const rows = ref<Plan[]>([]);
const total = ref(0);
const status = ref('');
const keyword = ref('');
const visible = ref(false);
const editing = ref<Plan>();
const priceVisible = ref(false);
const prices = ref<UsagePrice[]>([]);
const selected = ref<Plan>();
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
  const v = await listPlans({
    status: status.value,
    keyword: keyword.value,
    page: 1,
    pageSize: 100
  });
  rows.value = v.items || [];
  total.value = v.total || 0;
}
function open(v?: Plan) {
  editing.value = v;
  Object.assign(
    form,
    v
      ? { ...v, entitlements: JSON.stringify(v.entitlements_json, null, 2) }
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
  selected.value = v;
  const detail = await getPlan(v.id);
  prices.value = detail.usage_prices || [];
  priceVisible.value = true;
}
function editPrice(v?: UsagePrice) {
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
  if (!selected.value) return;
  await upsertUsagePrice({
    ...price,
    plan_id: selected.value.id,
    tiers_json: parseJSONArray(price.tiers, '阶梯')
  } as never);
  await manage(selected.value);
}
async function removePrice(v: UsagePrice) {
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
          <h2 class="m-0">套餐与价格</h2>
          <p class="mb-0 text-#999">金额统一使用最小货币单位，避免浮点误差。</p>
        </div>
        <ElButton type="primary" @click="open()">新建套餐</ElButton>
      </div>
    </template>
    <ElForm inline>
      <ElFormItem label="搜索"><ElInput v-model="keyword" /></ElFormItem>
      <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
      <ElButton @click="load">查询</ElButton>
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
          <ElButton link @click="open(row)">编辑</ElButton>
          <ElButton link @click="manage(row)">用量价格</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
    <div class="mt-12px">共 {{ total }} 条</div>
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
      <ElButton type="primary" @click="save">保存</ElButton>
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
      <ElButton type="primary" @click="savePrice">保存价格</ElButton>
    </ElForm>
    <ElTable :data="prices" border>
      <ElTableColumn prop="meter_code" label="计量项" />
      <ElTableColumn prop="pricing_model" label="模型" />
      <ElTableColumn prop="unit_amount_minor" label="单位金额" />
      <ElTableColumn label="操作">
        <template #default="{ row }">
          <ElButton link @click="editPrice(row)">编辑</ElButton>
          <ElButton link type="danger" @click="removePrice(row)">删除</ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </ElDrawer>
</template>
