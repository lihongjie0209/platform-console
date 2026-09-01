<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { usePlatformStore } from '@/store/modules/platform';
import { hasApplicationScope } from '@/platform/application-context';
import type { PaymentAttempt, Refund } from '../../api';
import { createPaymentAttempt, listPayments, listRefunds, recordRefund } from '../../api';
import { canRefundPayment, validatePaymentInput, validateRefundInput } from '../../payment-form';

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
const paymentDialogVisible = ref(false);
const refundDialogVisible = ref(false);
const selectedPayment = ref<PaymentAttempt>();
const paymentForm = reactive({ invoiceID: '', provider: '', paymentMethodReference: '' });
const refundForm = reactive({ providerRefundID: '', amountMinor: 0, reason: '', status: 'succeeded' });

async function load() {
  if (!scopeReady.value) {
    payments.value = [];
    refunds.value = [];
    return;
  }
  loading.value = true;
  try {
    if (activeTab.value === 'payments') {
      const result = await listPayments({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        status: status.value,
        page: 1,
        pageSize: 100
      });
      payments.value = result.items || [];
    } else {
      const result = await listRefunds({
        tenantID: tenantID.value,
        applicationID: applicationID.value,
        status: status.value,
        page: 1,
        pageSize: 100
      });
      refunds.value = result.items || [];
    }
  } finally {
    loading.value = false;
  }
}

function openPaymentDialog() {
  paymentForm.invoiceID = '';
  paymentForm.provider = '';
  paymentForm.paymentMethodReference = '';
  paymentDialogVisible.value = true;
}

async function submitPayment() {
  if (!scopeReady.value) return;
  const validationError = validatePaymentInput(paymentForm);
  if (validationError) {
    window.$message?.warning(validationError);
    return;
  }
  await createPaymentAttempt({
    tenantID: tenantID.value,
    applicationID: applicationID.value,
    invoiceID: paymentForm.invoiceID,
    provider: paymentForm.provider,
    paymentMethodReference: paymentForm.paymentMethodReference,
    idempotencyKey: crypto.randomUUID()
  });
  paymentForm.paymentMethodReference = '';
  paymentDialogVisible.value = false;
  await load();
}

function openRefundDialog(payment: PaymentAttempt) {
  selectedPayment.value = payment;
  refundForm.providerRefundID = '';
  refundForm.amountMinor = payment.amount_minor;
  refundForm.reason = '';
  refundForm.status = 'succeeded';
  refundDialogVisible.value = true;
}

async function submitRefund() {
  if (!selectedPayment.value) return;
  const validationError = validateRefundInput(refundForm);
  if (validationError) {
    window.$message?.warning(validationError);
    return;
  }
  await recordRefund({
    payment: selectedPayment.value,
    providerRefundID: refundForm.providerRefundID,
    amountMinor: refundForm.amountMinor,
    reason: refundForm.reason,
    status: refundForm.status,
    idempotencyKey: crypto.randomUUID()
  });
  selectedPayment.value = undefined;
  refundDialogVisible.value = false;
  await load();
}

watch([tenantID, applicationID], () => {
  selectedPayment.value = undefined;
  paymentDialogVisible.value = false;
  refundDialogVisible.value = false;
  load();
});
watch(activeTab, () => {
  status.value = '';
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
        <ElButton type="primary" :disabled="!scopeReady" @click="openPaymentDialog">发起支付</ElButton>
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
          <ElInput v-model="status" clearable placeholder="如 succeeded、failed" @keyup.enter="load" />
        </ElFormItem>
        <ElButton :loading="loading" @click="load">查询</ElButton>
      </ElForm>

      <ElTable v-if="activeTab === 'payments'" v-loading="loading" :data="payments" border>
        <ElTableColumn prop="id" label="支付 ID" min-width="220" show-overflow-tooltip />
        <ElTableColumn prop="invoice_id" label="账单 ID" min-width="200" show-overflow-tooltip />
        <ElTableColumn prop="provider" label="渠道" width="120" />
        <ElTableColumn prop="provider_payment_id" label="渠道支付号" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="130" />
        <ElTableColumn prop="currency" label="币种" width="90" />
        <ElTableColumn prop="amount_minor" label="金额(分)" width="120" />
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton v-if="canRefundPayment(row.status)" link type="danger" @click="openRefundDialog(row)">
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
        <ElTableColumn prop="created_at" label="创建时间" min-width="180" />
      </ElTable>
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
      <ElFormItem label="账单 ID"><ElInput v-model="paymentForm.invoiceID" /></ElFormItem>
      <ElFormItem label="支付渠道">
        <ElInput v-model="paymentForm.provider" placeholder="如 stripe、alipay" />
      </ElFormItem>
      <ElFormItem label="支付方式引用">
        <ElInput v-model="paymentForm.paymentMethodReference" type="password" show-password autocomplete="off" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="paymentDialogVisible = false">取消</ElButton>
      <ElButton type="primary" @click="submitPayment">提交</ElButton>
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
      <ElButton @click="refundDialogVisible = false">取消</ElButton>
      <ElButton type="danger" @click="submitRefund">确认退款</ElButton>
    </template>
  </ElDialog>
</template>
