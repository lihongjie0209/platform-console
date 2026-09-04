import type { components as BillingContract } from '@/service/contracts/generated/billing';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
type PlanContract = BillingContract['schemas']['httptransport.PlanBody'];
type UsagePriceContract = BillingContract['schemas']['httptransport.UsagePriceBody'];
type SubscriptionContract = BillingContract['schemas']['httptransport.SubscriptionBody'];
type InvoiceContract = BillingContract['schemas']['httptransport.InvoiceBody'];
type PaymentAttemptContract = BillingContract['schemas']['httptransport.PaymentAttemptBody'];
type RefundContract = BillingContract['schemas']['httptransport.RefundBody'];

export interface Plan extends Omit<PlanContract, 'entitlements_json'>, Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  description: string;
  currency: string;
  billing_interval: string;
  base_amount_minor: number;
  trial_days: number;
  status: string;
  entitlements_json: Record<string, unknown>;
  version: number;
}
export interface UsagePrice extends Omit<UsagePriceContract, 'tiers_json'>, Record<string, unknown> {
  id: string;
  plan_id: string;
  meter_code: string;
  included_quantity: number;
  unit_quantity: number;
  unit_amount_minor: number;
  pricing_model: string;
  tiers_json: Record<string, unknown>[];
  version: number;
}
export interface Subscription extends SubscriptionContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  version: number;
}
export interface Invoice extends InvoiceContract, Record<string, unknown> {
  id: string;
  number: string;
  tenant_id: string;
  application_id: string;
  subscription_id: string;
  currency: string;
  status: string;
  total_minor: number;
  paid_minor: number;
  refunded_minor: number;
  period_start: string;
  period_end: string;
  version: number;
}
export interface PaymentAttempt extends PaymentAttemptContract, Record<string, unknown> {
  id: string;
  invoice_id: string;
  tenant_id: string;
  application_id: string;
  provider: string;
  provider_payment_id: string;
  currency: string;
  amount_minor: number;
  status: string;
  failure_code: string;
  failure_message: string;
  processed_at?: string;
  version: number;
  created_at: string;
}
export interface Refund extends RefundContract, Record<string, unknown> {
  id: string;
  payment_attempt_id: string;
  invoice_id: string;
  tenant_id: string;
  application_id: string;
  provider_refund_id: string;
  amount_minor: number;
  reason: string;
  status: string;
  version: number;
  created_at: string;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
const request = platformRequest('billing');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('billing service returned an empty response');
  return data;
}
export const listPlans = (input: { status: string; keyword: string; page: number; pageSize: number }) =>
  unwrap<Page<Plan>>(
    request({
      url: '/api/v1/plans/list',
      method: 'post',
      data: {
        status: input.status,
        keyword: input.keyword,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
export const listAvailablePlans = (input: { keyword: string; page: number; pageSize: number }) =>
  unwrap<Page<Plan>>(
    request({
      url: '/api/v1/subscriptions/plans/list',
      method: 'post',
      data: { keyword: input.keyword, page: input.page, page_size: input.pageSize }
    })
  );
export function savePlan(current: Plan | undefined, input: Omit<Plan, 'id' | 'version'> & { idempotencyKey: string }) {
  return unwrap<Plan>(
    request({
      url: current ? '/api/v1/plans/update' : '/api/v1/plans/create',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: current
        ? {
            id: current.id,
            name: input.name,
            description: input.description,
            base_amount_minor: input.base_amount_minor,
            trial_days: input.trial_days,
            status: input.status,
            entitlements_json: input.entitlements_json,
            version: current.version
          }
        : {
            code: input.code,
            name: input.name,
            description: input.description,
            currency: input.currency,
            billing_interval: input.billing_interval,
            base_amount_minor: input.base_amount_minor,
            trial_days: input.trial_days,
            status: input.status,
            entitlements_json: input.entitlements_json
          }
    })
  );
}
export const getPlan = (id: string) =>
  unwrap<{ plan: Plan; usage_prices: UsagePrice[] }>(
    request({ url: '/api/v1/plans/get', method: 'post', data: { id } })
  );
export const upsertUsagePrice = (
  value: Partial<UsagePrice> & Pick<UsagePrice, 'plan_id' | 'meter_code'>,
  idempotencyKey: string,
  planVersion: number
) =>
  unwrap<UsagePrice>(
    request({
      url: '/api/v1/plans/usage-prices/upsert',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { ...value, expected_version: value.version || 0, plan_version: planVersion }
    })
  );
export const deleteUsagePrice = (value: UsagePrice, plan: Pick<Plan, 'id' | 'version'>, idempotencyKey: string) =>
  unwrap<null>(
    request({
      url: '/api/v1/plans/usage-prices/delete',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { id: value.id, version: value.version, plan_id: plan.id, plan_version: plan.version }
    })
  );
export const listSubscriptions = (input: {
  tenantID: string;
  applicationID: string;
  status: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<Page<Subscription>>(
    request({
      url: '/api/v1/subscriptions/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
export const getSubscriptionDetail = (value: Pick<Subscription, 'id' | 'tenant_id' | 'application_id'>) =>
  unwrap<{ subscription: Subscription; plan: Plan }>(
    request({
      url: '/api/v1/subscriptions/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
export const getSubscription = async (value: Pick<Subscription, 'id' | 'tenant_id' | 'application_id'>) =>
  (await getSubscriptionDetail(value)).subscription;
export const createSubscription = (input: {
  tenantID: string;
  applicationID: string;
  planID: string;
  planVersion: number;
  startsAt: string;
  externalReference: string;
  idempotencyKey: string;
}) =>
  unwrap<Subscription>(
    request({
      url: '/api/v1/subscriptions/create',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        plan_id: input.planID,
        plan_version: input.planVersion,
        starts_at: input.startsAt,
        external_reference: input.externalReference
      }
    })
  );
export const cancelSubscription = (value: Subscription, atPeriodEnd: boolean, idempotencyKey: string) =>
  unwrap<Subscription>(
    request({
      url: '/api/v1/subscriptions/cancel',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        id: value.id,
        at_period_end: atPeriodEnd,
        version: value.version
      }
    })
  );
export const changeSubscription = (input: {
  value: Subscription;
  plan: Pick<Plan, 'id' | 'version'>;
  effectiveMode: 'immediate' | 'next_period';
  idempotencyKey: string;
}) =>
  unwrap<Subscription>(
    request({
      url: '/api/v1/subscriptions/change',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: {
        ...applicationScope(input.value.tenant_id, input.value.application_id),
        id: input.value.id,
        plan_id: input.plan.id,
        plan_version: input.plan.version,
        effective_mode: input.effectiveMode,
        version: input.value.version
      }
    })
  );
export const listInvoices = (input: {
  tenantID: string;
  applicationID: string;
  status: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<Page<Invoice>>(
    request({
      url: '/api/v1/invoices/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
export const getInvoice = (value: Pick<Invoice, 'id' | 'tenant_id' | 'application_id'>) =>
  unwrap<Invoice>(
    request({
      url: '/api/v1/invoices/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
export const finalizeInvoice = (value: Invoice, dueAt: string, idempotencyKey: string) =>
  unwrap<Invoice>(
    request({
      url: '/api/v1/invoices/finalize',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        id: value.id,
        due_at: dueAt,
        version: value.version
      }
    })
  );
export const voidInvoice = (value: Invoice, reason: string, idempotencyKey: string) =>
  unwrap<Invoice>(
    request({
      url: '/api/v1/invoices/void',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        id: value.id,
        reason,
        version: value.version
      }
    })
  );

interface PaymentListInput {
  tenantID: string;
  applicationID: string;
  status: string;
  page: number;
  pageSize: number;
}

export const listPayments = (input: PaymentListInput) =>
  unwrap<Page<PaymentAttempt>>(
    request({
      url: '/api/v1/payments/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );

export const getPayment = (payment: Pick<PaymentAttempt, 'tenant_id' | 'application_id' | 'id'>) =>
  unwrap<PaymentAttempt>(
    request({
      url: '/api/v1/payments/get',
      method: 'post',
      data: { ...applicationScope(payment.tenant_id, payment.application_id), id: payment.id }
    })
  );

export const listRefunds = (input: PaymentListInput) =>
  unwrap<Page<Refund>>(
    request({
      url: '/api/v1/payments/refunds/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );

export const createPaymentAttempt = (input: {
  tenantID: string;
  applicationID: string;
  invoiceID: string;
  provider: string;
  paymentMethodReference: string;
  idempotencyKey: string;
}) =>
  unwrap<{ payment_attempt: PaymentAttempt; duplicate: boolean }>(
    request({
      url: '/api/v1/payments/create-attempt',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        invoice_id: input.invoiceID,
        provider: input.provider,
        payment_method_reference: input.paymentMethodReference,
        idempotency_key: input.idempotencyKey
      }
    })
  );

export const recordRefund = (input: {
  payment: PaymentAttempt;
  providerRefundID: string;
  amountMinor: number;
  reason: string;
  status: string;
  idempotencyKey: string;
}) =>
  unwrap<{ refund: Refund; invoice: Invoice; duplicate: boolean }>(
    request({
      url: '/api/v1/payments/refunds/record',
      method: 'post',
      data: {
        ...applicationScope(input.payment.tenant_id, input.payment.application_id),
        payment_attempt_id: input.payment.id,
        provider_refund_id: input.providerRefundID,
        amount_minor: input.amountMinor,
        reason: input.reason,
        status: input.status,
        idempotency_key: input.idempotencyKey
      }
    })
  );
