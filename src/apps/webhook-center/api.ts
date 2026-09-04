import type { components as Contract } from '@/service/contracts/generated/webhook';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
export type WebhookSubscription = Contract['schemas']['httptransport.SubscriptionBody'] & {
  id: string;
  tenant_id: string;
  application_id: string;
  name: string;
  endpoint_url: string;
  subject_filter: string;
  status: string;
  version: number;
};
export type WebhookDelivery = Contract['schemas']['httptransport.DeliveryBody'] & {
  id: string;
  tenant_id: string;
  application_id: string;
  subscription_id: string;
  event_subject: string;
  status: string;
  attempt_count: number;
  version: number;
};
interface PageBody<T> {
  items: T[];
  page: { total: number; page: number; page_size: number };
}
const request = platformRequest('webhook');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('webhook service returned an empty response');
  return data;
}
export const listSubscriptions = (input: {
  tenantID: string;
  applicationID: string;
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<PageBody<WebhookSubscription>>(
    request({
      url: '/api/v1/webhooks/subscriptions/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        search: input.search,
        page: { page: input.page, page_size: input.pageSize }
      }
    })
  );
export const getSubscription = (value: Pick<WebhookSubscription, 'id' | 'tenant_id' | 'application_id'>) =>
  unwrap<WebhookSubscription>(
    request({
      url: '/api/v1/webhooks/subscriptions/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
export function saveSubscription(
  current: WebhookSubscription | undefined,
  tenantID: string,
  input: {
    applicationID: string;
    name: string;
    endpointURL: string;
    subjectFilter: string;
    status: string;
    timeoutMS: number;
    maxAttempts: number;
    retryInitialSeconds: number;
    idempotencyKey: string;
  }
) {
  return unwrap<WebhookSubscription | { subscription: WebhookSubscription; signing_secret: string }>(
    request({
      url: current ? '/api/v1/webhooks/subscriptions/update' : '/api/v1/webhooks/subscriptions/create',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: current
        ? {
            id: current.id,
            ...applicationScope(tenantID, input.applicationID),
            name: input.name,
            endpoint_url: input.endpointURL,
            subject_filter: input.subjectFilter,
            status: input.status,
            timeout_ms: input.timeoutMS,
            max_attempts: input.maxAttempts,
            retry_initial_seconds: input.retryInitialSeconds,
            expected_version: current.version
          }
        : {
            ...applicationScope(tenantID, input.applicationID),
            name: input.name,
            endpoint_url: input.endpointURL,
            subject_filter: input.subjectFilter,
            timeout_ms: input.timeoutMS,
            max_attempts: input.maxAttempts,
            retry_initial_seconds: input.retryInitialSeconds
          }
    })
  );
}
export const rotateSecret = (value: WebhookSubscription, idempotencyKey: string) =>
  unwrap<{ subscription: WebhookSubscription; signing_secret: string }>(
    request({
      url: '/api/v1/webhooks/subscriptions/rotate-secret',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        expected_version: value.version
      }
    })
  );
export const deleteSubscription = (value: WebhookSubscription, idempotencyKey: string) =>
  unwrap<null>(
    request({
      url: '/api/v1/webhooks/subscriptions/delete',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        expected_version: value.version
      }
    })
  );
export const testSubscription = (
  value: WebhookSubscription,
  payload: Record<string, unknown>,
  idempotencyKey: string
) =>
  unwrap<WebhookDelivery>(
    request({
      url: '/api/v1/webhooks/subscriptions/test',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id), payload_json: payload }
    })
  );
export const listDeliveries = (input: {
  tenantID: string;
  applicationID: string;
  subscriptionID: string;
  status: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<PageBody<WebhookDelivery>>(
    request({
      url: '/api/v1/webhooks/deliveries/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        subscription_id: input.subscriptionID,
        status: input.status,
        page: { page: input.page, page_size: input.pageSize }
      }
    })
  );
export const getDelivery = (value: Pick<WebhookDelivery, 'id' | 'tenant_id' | 'application_id'>) =>
  unwrap<WebhookDelivery>(
    request({
      url: '/api/v1/webhooks/deliveries/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
export const replayDelivery = (value: WebhookDelivery, idempotencyKey: string) =>
  unwrap<WebhookDelivery>(
    request({
      url: '/api/v1/webhooks/deliveries/replay',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        expected_version: value.version
      }
    })
  );
