import type { components as Contract } from '@/service/contracts/generated/webhook';
import { platformRequest } from '@/service/request';
export type WebhookSubscription = Contract['schemas']['httptransport.SubscriptionBody'] & {
  id: string;
  tenant_id: string;
  name: string;
  endpoint_url: string;
  subject_filter: string;
  status: string;
  version: number;
};
export type WebhookDelivery = Contract['schemas']['httptransport.DeliveryBody'] & {
  id: string;
  tenant_id: string;
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
export const listSubscriptions = (input: { tenantID: string; applicationID: string; status: string; search: string }) =>
  unwrap<PageBody<WebhookSubscription>>(
    request({
      url: '/api/v1/webhooks/subscriptions/list',
      method: 'post',
      data: {
        tenant_id: input.tenantID,
        application_id: input.applicationID,
        status: input.status,
        search: input.search,
        page: { page: 1, page_size: 100 }
      }
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
  }
) {
  return unwrap<WebhookSubscription | { subscription: WebhookSubscription; signing_secret: string }>(
    request({
      url: current ? '/api/v1/webhooks/subscriptions/update' : '/api/v1/webhooks/subscriptions/create',
      method: 'post',
      data: current
        ? {
            id: current.id,
            tenant_id: tenantID,
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
            tenant_id: tenantID,
            application_id: input.applicationID,
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
export const rotateSecret = (value: WebhookSubscription) =>
  unwrap<{ subscription: WebhookSubscription; signing_secret: string }>(
    request({
      url: '/api/v1/webhooks/subscriptions/rotate-secret',
      method: 'post',
      data: { id: value.id, tenant_id: value.tenant_id, expected_version: value.version }
    })
  );
export const deleteSubscription = (value: WebhookSubscription) =>
  unwrap<null>(
    request({
      url: '/api/v1/webhooks/subscriptions/delete',
      method: 'post',
      data: { id: value.id, tenant_id: value.tenant_id, expected_version: value.version }
    })
  );
export const testSubscription = (value: WebhookSubscription, payload: Record<string, unknown>) =>
  unwrap<WebhookDelivery>(
    request({
      url: '/api/v1/webhooks/subscriptions/test',
      method: 'post',
      data: { id: value.id, tenant_id: value.tenant_id, payload_json: payload }
    })
  );
export const listDeliveries = (input: { tenantID: string; subscriptionID: string; status: string }) =>
  unwrap<PageBody<WebhookDelivery>>(
    request({
      url: '/api/v1/webhooks/deliveries/list',
      method: 'post',
      data: {
        tenant_id: input.tenantID,
        subscription_id: input.subscriptionID,
        status: input.status,
        page: { page: 1, page_size: 100 }
      }
    })
  );
export const replayDelivery = (value: WebhookDelivery) =>
  unwrap<WebhookDelivery>(
    request({
      url: '/api/v1/webhooks/deliveries/replay',
      method: 'post',
      data: { id: value.id, tenant_id: value.tenant_id, expected_version: value.version }
    })
  );
