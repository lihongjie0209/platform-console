import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
export interface Plan extends Record<string, unknown> {
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
export interface UsagePrice extends Record<string, unknown> {
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
export interface Subscription extends Record<string, unknown> {
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
export interface Invoice extends Record<string, unknown> {
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
export interface PaymentAttempt extends Record<string, unknown> {
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
export interface Refund extends Record<string, unknown> {
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
export function savePlan(current: Plan | undefined, input: Omit<Plan, 'id' | 'version'>) {
  return unwrap<Plan>(
    request({
      url: current ? '/api/v1/plans/update' : '/api/v1/plans/create',
      method: 'post',
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
        : input
    })
  );
}
export const getPlan = (id: string) =>
  unwrap<{ plan: Plan; usage_prices: UsagePrice[] }>(
    request({ url: '/api/v1/plans/get', method: 'post', data: { id } })
  );
export const upsertUsagePrice = (value: Partial<UsagePrice> & Pick<UsagePrice, 'plan_id' | 'meter_code'>) =>
  unwrap<UsagePrice>(
    request({
      url: '/api/v1/plans/usage-prices/upsert',
      method: 'post',
      data: { ...value, expected_version: value.version || 0 }
    })
  );
export const deleteUsagePrice = (value: UsagePrice) =>
  unwrap<null>(
    request({
      url: '/api/v1/plans/usage-prices/delete',
      method: 'post',
      data: { id: value.id, version: value.version }
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
export const createSubscription = (input: {
  tenantID: string;
  applicationID: string;
  planID: string;
  startsAt: string;
  externalReference: string;
}) =>
  unwrap<Subscription>(
    request({
      url: '/api/v1/subscriptions/create',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        plan_id: input.planID,
        starts_at: input.startsAt,
        external_reference: input.externalReference
      }
    })
  );
export const cancelSubscription = (value: Subscription, atPeriodEnd: boolean) =>
  unwrap<Subscription>(
    request({
      url: '/api/v1/subscriptions/cancel',
      method: 'post',
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        id: value.id,
        at_period_end: atPeriodEnd,
        version: value.version
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
export const finalizeInvoice = (value: Invoice, dueAt: string) =>
  unwrap<Invoice>(
    request({
      url: '/api/v1/invoices/finalize',
      method: 'post',
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        id: value.id,
        due_at: dueAt,
        version: value.version
      }
    })
  );
export const voidInvoice = (value: Invoice, reason: string) =>
  unwrap<Invoice>(
    request({
      url: '/api/v1/invoices/void',
      method: 'post',
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
