<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { createLatestRequestGuard, hasApplicationScope } from '@/platform/application-context';
import { formatPlatformTableDateTime } from '@/platform/date-time';
import { operationPromise } from '@/platform/idempotency-key';
import { useKeyedAsyncAction } from '@/platform/keyed-async-action';
import { hasPersistedVersionChanged } from '@/platform/optimistic-mutation';
import { remoteSearchPage } from '@/platform/remote-search';
import type { Invoice, PaymentAttempt, Refund } from '../../api';
import {
  createPaymentAttempt,
  getPayment,
  listPayableInvoices,
  listPayments,
  listRefunds,
  recordRefund
} from '../../api';
import { canRefundPayment, ensureIdempotencyKey, validatePaymentInput, validateRefundInput } from '../../payment-form';

defineOptions({ name: 'BillingCenterPayments' });

const store = usePlatformStore();
const tenantID = computed(() => store.selectedTenantId);
const applicationID = computed(() => store.selectedApplicationId);
const applicationName = computed(() => store.selectedApplication?.name || '当前应用');
const scopeReady = computed(() => hasApplicationScope(tenantID.value, applicationID.value));
const activeTab = ref<'payments' | 'refunds'>('payments');
const status = ref('');
const loading = ref(false);
const payments = ref<PaymentAttempt[]>([]);
const refunds = ref<Refund[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const paymentDialogVisible = ref(false);
const refundDialogVisible = ref(false);
const selectedPayment = ref<PaymentAttempt>();
const payableInvoices = ref<Invoice[]>([]);
const invoicesLoading = ref(false);
const loadGuard = createLatestRequestGuard();
const invoiceGuard = createLatestRequestGuard();
const { active: activeAction, run: runAction } = useKeyedAsyncAction();
const canCreate = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.payment.create' }));
const canRead = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.payment.read' }));
const canRefund = computed(() => store.hasPermission({ scope: 'tenant', codes: 'billing.payment.refund' }));
const paymentForm = reactive({
  invoiceID: '',
  invoiceVersion: 0,
  provider: '',
  paymentMethodReference: '',
  idempotencyKey: ''
});
const paymentBaselines = new Map<string, Promise<Invoice>>();
const refundForm = reactive({
  providerRefundID: '',
  amountMinor: 0,
  reason: '',
  status: 'succeeded',
  idempotencyKey: ''
});

async function load() {
  const request = loadGuard.begin();
  if (!scopeReady.value) {
    payments.value = [];
    refunds.value = [];
    total.value = 0;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    if (activeTab.value === 'payments') {
      const result = await listPayments({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        status: status.value,
        page: page.value,
        pageSize: pageSize.value
      });
      if (loadGuard.isCurrent(request)) {
        payments.value = result.items || [];
        total.value = result.total || 0;
      }
    } else {
      const result = await listRefunds({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        status: status.value,
        page: page.value,
        pageSize: pageSize.value
      });
      if (loadGuard.isCurrent(request)) {
        refunds.value = result.items || [];
        total.value = result.total || 0;
      }
    }
  } finally {
    if (loadGuard.isCurrent(request)) loading.value = false;
  }
}
function search() {
  page.value = 1;
  load();
}

async function searchPayableInvoices(keyword = '') {
  const request = invoiceGuard.begin();
  invoicesLoading.value = true;
  try {
    const result = await listPayableInvoices({
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      keyword,
      ...remoteSearchPage(50)
    });
    if (invoiceGuard.isCurrent(request)) payableInvoices.value = result.items || [];
  } finally {
    if (invoiceGuard.isCurrent(request)) invoicesLoading.value = false;
  }
}
function selectInvoice(invoiceID: string) {
  paymentForm.invoiceVersion = payableInvoices.value.find(invoice => invoice.id === invoiceID)?.version || 0;
}
function openPaymentDialog() {
  if (!canCreate.value) return;
  paymentForm.invoiceID = '';
  paymentForm.invoiceVersion = 0;
  paymentForm.provider = '';
  paymentForm.paymentMethodReference = '';
  paymentForm.idempotencyKey = '';
  paymentBaselines.clear();
  paymentDialogVisible.value = true;
  searchPayableInvoices();
}

async function submitPayment() {
  if (!canCreate.value || !scopeReady.value) return;
  const validationError = validatePaymentInput(paymentForm);
  if (validationError) {
    window.$message?.warning(validationError);
    return;
  }
  await runAction('payment:create', async () => {
    const selectedInvoice = payableInvoices.value.find(invoice => invoice.id === paymentForm.invoiceID);
    if (!selectedInvoice) return;
    const input = {
      tenantID: tenantID.value,
      applicationID: applicationID.value,
      invoiceID: paymentForm.invoiceID,
      invoiceVersion: paymentForm.invoiceVersion,
      provider: paymentForm.provider,
      paymentMethodReference: paymentForm.paymentMethodReference
    };
    const operation = JSON.stringify([
      input.tenantID,
      input.applicationID,
      input.invoiceID,
      input.invoiceVersion,
      input.provider
    ]);
    const current = await operationPromise(paymentBaselines, operation, async () => {
      const result = await listPayableInvoices({
        tenantID: input.tenantID,
        applicationID: input.applicationID,
        keyword: selectedInvoice.number,
        ...remoteSearchPage(50)
      });
      const invoice = result.items.find(item => item.id === selectedInvoice.id);
      if (!invoice) throw new Error('所选账单已不可支付，请重新选择');
      return invoice;
    });
    if (current.status !== 'open' || hasPersistedVersionChanged(input.invoiceVersion, current.version)) {
      window.$message?.warning('账单金额或状态已变化，请重新选择后重试');
      return;
    }
    paymentForm.idempotencyKey = ensureIdempotencyKey(paymentForm.idempotencyKey);
    await createPaymentAttempt({
      tenantID: input.tenantID,
      applicationID: input.applicationID,
      invoiceID: input.invoiceID,
      invoiceVersion: current.version,
      provider: input.provider,
      paymentMethodReference: input.paymentMethodReference,
      idempotencyKey: paymentForm.idempotencyKey
    });
    paymentForm.paymentMethodReference = '';
    paymentBaselines.clear();
    paymentDialogVisible.value = false;
    await load();
  });
}

async function openRefundDialog(payment: PaymentAttempt) {
  if (!canRefund.value || !canRead.value) return;
  const current = await getPayment(payment);
  if (!canRefundPayment(current.status)) {
    window.$message?.warning('支付状态已变化，当前记录无法退款');
    await load();
    return;
  }
  selectedPayment.value = current;
  refundForm.providerRefundID = '';
  refundForm.amountMinor = current.amount_minor;
  refundForm.reason = '';
  refundForm.status = 'succeeded';
  refundForm.idempotencyKey = '';
  refundDialogVisible.value = true;
}

async function submitRefund() {
  if (!canRefund.value || !selectedPayment.value) return;
  const validationError = validateRefundInput(refundForm);
  if (validationError) {
    window.$message?.warning(validationError);
    return;
  }
  const payment = selectedPayment.value;
  await runAction(`payment:${payment.id}:refund`, async () => {
    refundForm.idempotencyKey = ensureIdempotencyKey(refundForm.idempotencyKey);
    await recordRefund({
      payment,
      providerRefundID: refundForm.providerRefundID,
      amountMinor: refundForm.amountMinor,
      reason: refundForm.reason,
      status: refundForm.status,
      idempotencyKey: refundForm.idempotencyKey
    });
    selectedPayment.value = undefined;
    refundDialogVisible.value = false;
    await load();
  });
}

watch(
  () => [paymentForm.invoiceID, paymentForm.invoiceVersion, paymentForm.provider, paymentForm.paymentMethodReference],
  () => {
    paymentForm.idempotencyKey = '';
    paymentBaselines.clear();
  }
);
watch(
  () => [refundForm.providerRefundID, refundForm.amountMinor, refundForm.reason, refundForm.status],
  () => {
    refundForm.idempotencyKey = '';
  }
);

watch([tenantID, applicationID], () => {
  payments.value = [];
  refunds.value = [];
  total.value = 0;
  page.value = 1;
  selectedPayment.value = undefined;
  paymentDialogVisible.value = false;
  refundDialogVisible.value = false;
  payableInvoices.value = [];
  paymentBaselines.clear();
  invoiceGuard.invalidate();
  load();
});
watch(activeTab, () => {
  status.value = '';
  page.value = 1;
  total.value = 0;
  load();
});
onMounted(load);
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <div class="flex-y-center justify-between gap-12px">
        <div>
          <h2 class="m-0">支付与退款</h2>
          <p class="mb-0 mt-6px text-13px text-#999">
            {{ applicationName }} · 查询支付尝试和退款记录，并通过幂等请求发起收款或退款。
          </p>
        </div>
        <ElButton v-if="canCreate" type="primary" :disabled="!scopeReady" @click="openPaymentDialog">发起支付</ElButton>
      </div>
    </template>

    <ElAlert v-if="!scopeReady" title="请先选择租户和应用" type="warning" show-icon :closable="false" />
    <template v-else>
      <ElTabs v-model="activeTab">
        <ElTabPane label="支付尝试" name="payments" />
        <ElTabPane label="退款记录" name="refunds" />
      </ElTabs>
      <ElForm inline>
        <ElFormItem label="状态">
          <ElInput v-model="status" clearable placeholder="如 succeeded、failed" @keyup.enter="search" />
        </ElFormItem>
        <ElButton :loading="loading" @click="search">查询</ElButton>
      </ElForm>

      <ElTable v-if="activeTab === 'payments'" v-loading="loading" :data="payments" border>
        <ElTableColumn prop="id" label="支付 ID" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="invoice_id" label="账单 ID" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="provider" label="渠道" width="120" />
        <ElTableColumn prop="provider_payment_id" label="渠道支付号" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="130" />
        <ElTableColumn prop="currency" label="币种" width="90" />
        <ElTableColumn prop="amount_minor" label="金额(分)" width="120" />
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" :formatter="formatPlatformTableDateTime" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="canRefund && canRead && canRefundPayment(row.status)"
              link
              type="danger"
              @click="openRefundDialog(row)"
            >
              退款
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <ElTable v-else v-loading="loading" :data="refunds" border>
        <ElTableColumn prop="id" label="退款 ID" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="payment_attempt_id" label="支付 ID" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="provider_refund_id" label="渠道退款号" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="130" />
        <ElTableColumn prop="amount_minor" label="金额(分)" width="120" />
        <ElTableColumn prop="reason" label="原因" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" :formatter="formatPlatformTableDateTime" />
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

  <ElDialog v-model="paymentDialogVisible" title="发起支付" width="520px" destroy-on-close>
    <ElAlert
      class="mb-16px"
      title="支付方式引用仅发送给计费服务，不会保存在浏览器状态中。"
      type="info"
      show-icon
      :closable="false"
    />
    <ElForm label-width="110px">
      <ElFormItem label="账单">
        <ElSelect
          v-model="paymentForm.invoiceID"
          class="w-full"
          filterable
          remote
          reserve-keyword
          placeholder="搜索账单号并选择可支付账单"
          :remote-method="searchPayableInvoices"
          :loading="invoicesLoading"
          @change="selectInvoice"
        >
          <ElOption
            v-for="invoice in payableInvoices"
            :key="invoice.id"
            :label="`${invoice.number} · ${invoice.currency} ${invoice.total_minor - invoice.paid_minor}`"
            :value="invoice.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="支付渠道">
        <ElInput v-model="paymentForm.provider" placeholder="如 stripe、alipay" />
      </ElFormItem>
      <ElFormItem label="支付方式引用">
        <ElInput v-model="paymentForm.paymentMethodReference" type="password" show-password autocomplete="off" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="Boolean(activeAction)" @click="paymentDialogVisible = false">取消</ElButton>
      <ElButton v-if="canCreate" type="primary" :loading="activeAction === 'payment:create'" @click="submitPayment">
        提交
      </ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="refundDialogVisible" title="记录退款" width="520px" destroy-on-close>
    <ElForm label-width="110px">
      <ElFormItem label="渠道退款号"><ElInput v-model="refundForm.providerRefundID" /></ElFormItem>
      <ElFormItem label="退款金额(分)">
        <ElInputNumber v-model="refundForm.amountMinor" :min="1" class="w-full" />
      </ElFormItem>
      <ElFormItem label="退款状态">
        <ElSelect v-model="refundForm.status" class="w-full">
          <ElOption label="处理中" value="pending" />
          <ElOption label="成功" value="succeeded" />
          <ElOption label="失败" value="failed" />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="退款原因"><ElInput v-model="refundForm.reason" type="textarea" :rows="3" /></ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton :disabled="Boolean(activeAction)" @click="refundDialogVisible = false">取消</ElButton>
      <ElButton
        v-if="canRefund"
        type="danger"
        :loading="activeAction === `payment:${selectedPayment?.id}:refund`"
        @click="submitRefund"
      >
        确认退款
      </ElButton>
    </template>
  </ElDialog>
</template>
