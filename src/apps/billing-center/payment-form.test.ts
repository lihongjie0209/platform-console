import assert from 'node:assert/strict';
import test from 'node:test';
import { canRefundPayment, ensureIdempotencyKey, validatePaymentInput, validateRefundInput } from './payment-form';

test('payment forms reject incomplete or unsafe input', () => {
  assert.equal(
    validatePaymentInput({ invoiceID: '', provider: 'test', paymentMethodReference: 'ref' }),
    '请输入账单 ID'
  );
  assert.equal(
    validatePaymentInput({ invoiceID: 'invoice-1', provider: '', paymentMethodReference: 'ref' }),
    '请输入支付渠道'
  );
  assert.equal(
    validatePaymentInput({ invoiceID: 'invoice-1', provider: 'test', paymentMethodReference: '' }),
    '请输入支付方式引用'
  );
  assert.equal(validatePaymentInput({ invoiceID: 'invoice-1', provider: 'test', paymentMethodReference: 'ref' }), '');
  assert.equal(validateRefundInput({ amountMinor: 0, reason: 'duplicate' }), '退款金额必须是正整数');
  assert.equal(validateRefundInput({ amountMinor: 10.5, reason: 'duplicate' }), '退款金额必须是正整数');
  assert.equal(validateRefundInput({ amountMinor: 10, reason: ' ' }), '请输入退款原因');
  assert.equal(validateRefundInput({ amountMinor: 10, reason: 'duplicate' }), '');
});

test('refund action is available only for successful payments', () => {
  assert.equal(canRefundPayment('succeeded'), true);
  assert.equal(canRefundPayment(' SUCCEEDED '), true);
  assert.equal(canRefundPayment('pending'), false);
  assert.equal(canRefundPayment('failed'), false);
});

test('financial operation retries preserve one idempotency key', () => {
  let generated = 0;
  const create = () => {
    generated += 1;
    return `operation-${generated}`;
  };
  const initial = ensureIdempotencyKey('', create);
  const retry = ensureIdempotencyKey(initial, create);

  assert.equal(initial, 'operation-1');
  assert.equal(retry, initial);
  assert.equal(generated, 1);
});
