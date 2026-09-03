export function canRefundPayment(status: string) {
  return status.trim().toLowerCase() === 'succeeded';
}

export function ensureIdempotencyKey(current: string, generate: () => string = () => crypto.randomUUID()) {
  return current || generate();
}

export function validatePaymentInput(input: { invoiceID: string; provider: string; paymentMethodReference: string }) {
  if (!input.invoiceID.trim()) return '请输入账单 ID';
  if (!input.provider.trim()) return '请输入支付渠道';
  if (!input.paymentMethodReference.trim()) return '请输入支付方式引用';
  return '';
}

export function validateRefundInput(input: { amountMinor: number; reason: string }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return '退款金额必须是正整数';
  if (!input.reason.trim()) return '请输入退款原因';
  return '';
}
