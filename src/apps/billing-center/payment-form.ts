export function canRefundPayment(status: string) {
  return status.trim().toLowerCase() === 'succeeded';
}

export { ensureIdempotencyKey } from '@/platform/idempotency-key';

export function validatePaymentInput(input: {
  invoiceID: string;
  invoiceVersion: number;
  provider: string;
  paymentMethodReference: string;
}) {
  if (!input.invoiceID.trim() || input.invoiceVersion < 1) return '请选择可支付账单';
  if (!input.provider.trim()) return '请输入支付渠道';
  if (!input.paymentMethodReference.trim()) return '请输入支付方式引用';
  return '';
}

export function validateRefundInput(input: { amountMinor: number; reason: string }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return '退款金额必须是正整数';
  if (!input.reason.trim()) return '请输入退款原因';
  return '';
}
