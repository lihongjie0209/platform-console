<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { ensureIdempotencyKey, operationIdempotencyKey, operationPromise } from '@/platform/idempotency-key';
import { useKeyedAsyncAction } from '@/platform/keyed-async-action';
import { hasPersistedStateChanged, hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import { remoteSearchPage } from '@/platform/remote-search';
import { confirmUserAction } from '@/platform/user-action';
import type { Plan, Subscription } from '../../api';
import {
  cancelSubscription,
  changeSubscription,
  createSubscription,
  getSubscription,
  listAvailablePlans,
  listSubscriptions
} from '../../api';
defineOptions({ name: 'BillingCenterSubscriptions' });
const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const rows = ref<Subscription[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const status = ref('');
const visible = ref(false);
const changeVisible = ref(false);
const changingSubscription = ref<Subscription>();
const form = reactive({ planID: '', planVersion: 0, startsAt: '', externalReference: '' });
const changeForm = reactive<{ planID: string; planVersion: number; effectiveMode: 'immediate' | 'next_period' }>({
  planID: '',
  planVersion: 0,
  effectiveMode: 'next_period'
});
const plans = ref<Plan[]>([]);
const plansLoading = ref(false);
const createIdempotencyKey = ref('');
const createBaselines = new Map<string, Promise<Plan>>();
const changeKeys = new Map<string, string>();
const changeBaselines = new Map<string, Promise<{ subscription: Subscription; plan: Plan }>>();
const cancelIdempotencyKeys = new Map<string, string>();
const cancelBaselines = new Map<string, Promise<Subscription>>();
const { active: actionLoading, run: runAction, reset: resetAction } = useKeyedAsyncAction();
const loadGuard = createLatestRequestGuard();
const planGuard = createLatestRequestGuard();
const canCreate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.create' }));
const canCancel = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.cancel' }));
const canChange = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.update' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.subscription.read' }));
async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    rows.value = [];
    total.value = 0;
    return;
  }
  const v = await listSubscriptions({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    status: status.value,
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
async function searchPlans(keyword = '') {
  const request = planGuard.begin();
  plansLoading.value = true;
  try {
    const result = await listAvailablePlans({ keyword, ...remoteSearchPage(50) });
    if (planGuard.isCurrent(request)) plans.value = result.items || [];
  } finally {
    if (planGuard.isCurrent(request)) plansLoading.value = false;
  }
}
function selectPlan(planID: string) {
  form.planVersion = plans.value.find(plan => plan.id === planID)?.version || 0;
}
function selectChangePlan(planID: string) {
  changeForm.planVersion = plans.value.find(plan => plan.id === planID)?.version || 0;
}
function openCreate() {
  Object.assign(form, { planID: '', planVersion: 0, startsAt: '', externalReference: '' });
  createIdempotencyKey.value = '';
  createBaselines.clear();
  visible.value = true;
  searchPlans();
}
async function create() {
  await runAction('subscription:create', async () => {
    if (!canCreate.value || !scopeReady.value || !form.planID || form.planVersion < 1) return;
    const selectedPlan = plans.value.find(plan => plan.id === form.planID);
    if (!selectedPlan) return;
    const input = {
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      planID: form.planID,
      planVersion: form.planVersion,
      startsAt: form.startsAt,
      externalReference: form.externalReference
    };
    const operation = JSON.stringify([
      'subscription:create',
      input.tenantID,
      input.applicationID,
      input.planID,
      input.planVersion,
      input.startsAt,
      input.externalReference
    ]);
    const current = await operationPromise(createBaselines, operation, async () => {
      const result = await listAvailablePlans({ keyword: selectedPlan.code, ...remoteSearchPage(50) });
      const plan = result.items.find(item => item.id === input.planID);
      if (!plan) throw new Error('所选套餐已不可订阅，请重新选择');
      return plan;
    });
    if (current.status !== 'active' || hasPersistedVersionChanged(input.planVersion, current.version)) {
      window.$message?.warning('套餐已发生变化，请重新选择后重试');
      return;
    }
    createIdempotencyKey.value = ensureIdempotencyKey(createIdempotencyKey.value);
    await createSubscription({
      tenantID: input.tenantID,
      applicationID: input.applicationID,
      planID: input.planID,
      planVersion: current.version,
      startsAt: input.startsAt,
      externalReference: input.externalReference,
      idempotencyKey: createIdempotencyKey.value
    });
    createIdempotencyKey.value = '';
    createBaselines.clear();
    visible.value = false;
    await load();
  });
}
async function openChange(value: Subscription) {
  if (!canChange.value || !canRead.value) return;
  await runAction(`${value.id}:prepare-change`, async () => {
    const current = await getSubscription(value);
    if (hasPersistedVersionChanged(value.version, current.version)) {
      window.$message?.warning('订阅已发生变化，请确认最新状态后重试');
      await load();
      return;
    }
    changingSubscription.value = current;
    Object.assign(changeForm, { planID: '', planVersion: 0, effectiveMode: 'next_period' });
    changeKeys.clear();
    changeBaselines.clear();
    changeVisible.value = true;
    searchPlans();
  });
}
async function change() {
  const visibleSubscription = changingSubscription.value;
  const selectedPlan = plans.value.find(plan => plan.id === changeForm.planID);
  if (!visibleSubscription || !selectedPlan || changeForm.planVersion < 1) return;
  const input = {
    subscription: visibleSubscription,
    plan: { id: selectedPlan.id, version: changeForm.planVersion },
    effectiveMode: changeForm.effectiveMode
  };
  const operation = JSON.stringify([
    'subscription:change',
    input.subscription.id,
    input.subscription.version,
    input.plan.id,
    input.plan.version,
    input.effectiveMode
  ]);
  await runAction(`${visibleSubscription.id}:change`, async () => {
    const baseline = await operationPromise(changeBaselines, operation, async () => {
      const [subscription, planPage] = await Promise.all([
        getSubscription(input.subscription),
        listAvailablePlans({ keyword: selectedPlan.code, ...remoteSearchPage(50) })
      ]);
      const plan = planPage.items.find(item => item.id === input.plan.id);
      if (!plan) throw new Error('目标套餐已不可订阅，请重新选择');
      return { subscription, plan };
    });
    if (
      hasPersistedVersionChanged(input.subscription.version, baseline.subscription.version) ||
      baseline.plan.status !== 'active' ||
      hasPersistedVersionChanged(input.plan.version, baseline.plan.version)
    ) {
      window.$message?.warning('订阅或目标套餐已发生变化，请刷新后重试');
      return;
    }
    await changeSubscription({
      value: baseline.subscription,
      plan: baseline.plan,
      effectiveMode: input.effectiveMode,
      idempotencyKey: operationIdempotencyKey(changeKeys, operation)
    });
    changeKeys.clear();
    changeBaselines.clear();
    changeVisible.value = false;
    await load();
  });
}
async function cancel(v: Subscription) {
  if (!canCancel.value || !canRead.value) return;
  const confirmed = await confirmUserAction(() =>
    ElMessageBox.confirm('取消将在当前计费周期结束后生效，确认继续吗？', '取消订阅', { type: 'warning' })
  );
  if (!confirmed) return;
  const key = `${v.id}:cancel`;
  await runAction(key, async () => {
    const current = await operationPromise(cancelBaselines, key, () => getSubscription(v));
    if (hasPersistedStateChanged(v.status, current.status) || current.cancel_at_period_end) {
      cancelIdempotencyKeys.delete(key);
      cancelBaselines.delete(key);
      window.$message?.warning('订阅状态已变化，请确认最新状态后重试');
      await load();
      return;
    }
    await cancelSubscription(current, true, operationIdempotencyKey(cancelIdempotencyKeys, key));
    cancelIdempotencyKeys.delete(key);
    cancelBaselines.delete(key);
    await load();
  });
}
watch(
  () => [form.planID, form.planVersion, form.startsAt, form.externalReference],
  () => {
    createIdempotencyKey.value = '';
    createBaselines.clear();
  }
);
watch(
  () => [changeForm.planID, changeForm.planVersion, changeForm.effectiveMode],
  () => {
    changeKeys.clear();
    changeBaselines.clear();
  }
);
watch([tenantID, applicationID], () => {
  rows.value = [];
  total.value = 0;
  page.value = 1;
  visible.value = false;
  changeVisible.value = false;
  changingSubscription.value = undefined;
  createIdempotencyKey.value = '';
  createBaselines.clear();
  changeKeys.clear();
  changeBaselines.clear();
  plans.value = [];
  planGuard.invalidate();
  cancelIdempotencyKeys.clear();
  cancelBaselines.clear();
  resetAction();
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between">
        <div>
          <h2 class="m-0">应用订阅</h2>
          <p class="mb-0 text-#999">{{ applicationName }} · 套餐订阅、变更与周期末取消均由计费服务维护。</p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="openCreate">创建订阅</ElButton>
      </div>
    </template>
    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElForm inline>
        <ElFormItem label="状态"><ElInput v-model="status" /></ElFormItem>
        <ElButton @click="search">查询</ElButton>
      </ElForm>
      <ElTable :data="rows" border>
        <ElTableColumn prop="id" label="订阅 ID" />
        <ElTableColumn prop="plan_id" label="套餐 ID" />
        <ElTableColumn prop="status" label="状态" />
        <ElTableColumn prop="current_period_start" label="周期开始" />
        <ElTableColumn prop="current_period_end" label="周期结束" />
        <ElTableColumn label="操作">
          <template #default="{ row }">
            <ElButton
              v-if="canChange && canRead && ['active', 'trialing'].includes(row.status)"
              link
              type="primary"
              :loading="actionLoading === `${row.id}:prepare-change` || actionLoading === `${row.id}:change`"
              :disabled="Boolean(actionLoading)"
              @click="openChange(row)"
            >
              变更套餐
            </ElButton>
            <ElButton
              v-if="canCancel && canRead && row.status === 'active'"
              link
              type="danger"
              :loading="actionLoading === `${row.id}:cancel`"
              :disabled="Boolean(actionLoading)"
              @click="cancel(row)"
            >
              周期末取消
            </ElButton>
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
    </template>
  </ElCard>
  <ElDialog v-model="visible" title="创建订阅">
    <ElForm label-width="100px">
      <ElFormItem label="套餐">
        <ElSelect
          v-model="form.planID"
          class="w-full"
          filterable
          remote
          reserve-keyword
          placeholder="搜索并选择可订阅套餐"
          :remote-method="searchPlans"
          :loading="plansLoading"
          @change="selectPlan"
        >
          <ElOption v-for="plan in plans" :key="plan.id" :label="`${plan.name} (${plan.code})`" :value="plan.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="开始时间">
        <ElDatePicker v-model="form.startsAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" />
      </ElFormItem>
      <ElFormItem label="外部引用"><ElInput v-model="form.externalReference" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">取消</ElButton>
      <ElButton
        v-if="canCreate"
        type="primary"
        :loading="actionLoading === 'subscription:create'"
        :disabled="!form.planID || form.planVersion < 1"
        @click="create"
      >
        创建
      </ElButton>
    </template>
  </ElDialog>
  <ElDialog v-model="changeVisible" title="变更套餐" :close-on-click-modal="!actionLoading">
    <ElForm label-width="100px">
      <ElFormItem label="目标套餐">
        <ElSelect
          v-model="changeForm.planID"
          class="w-full"
          filterable
          remote
          reserve-keyword
          placeholder="搜索并选择可订阅套餐"
          :remote-method="searchPlans"
          :loading="plansLoading"
          @change="selectChangePlan"
        >
          <ElOption v-for="plan in plans" :key="plan.id" :label="`${plan.name} (${plan.code})`" :value="plan.id" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="生效时间">
        <ElRadioGroup v-model="changeForm.effectiveMode">
          <ElRadio value="next_period">下个计费周期</ElRadio>
          <ElRadio value="immediate">立即生效</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="Boolean(actionLoading)" @click="changeVisible = false">取消</ElButton>
      <ElButton
        type="primary"
        :loading="actionLoading === `${changingSubscription?.id}:change`"
        :disabled="!changeForm.planID || changeForm.planVersion < 1"
        @click="change"
      >
        确认变更
      </ElButton>
    </template>
  </ElDialog>
</template>
