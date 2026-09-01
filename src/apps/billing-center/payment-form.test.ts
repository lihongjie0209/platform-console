import assert from 'node:assert/strict';
import test from 'node:test';
import { canRefundPayment, validatePaymentInput, validateRefundInput } from './payment-form';

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
