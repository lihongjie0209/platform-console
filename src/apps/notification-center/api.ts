import type { components as NotificationContract } from '@/service/contracts/generated/notification';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';

type TemplateContract = NotificationContract['schemas']['httptransport.TemplateResponseBody'];
type DeliveryContract = NotificationContract['schemas']['httptransport.DeliveryResponseBody'];
type ProviderContract = NotificationContract['schemas']['httptransport.ProviderResponseBody'];

export interface NotificationProvider extends ProviderContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  code: string;
  channel: string;
  upstream: string;
  path: string;
  priority: number;
  status: string;
  version: number;
}

export interface NotificationTemplate extends TemplateContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  code: string;
  channel: string;
  locale: string;
  subject: string;
  content: string;
  status: string;
  version: number;
}

export interface NotificationDelivery extends DeliveryContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  template_code: string;
  channel: string;
  locale: string;
  recipient: string;
  status: string;
  attempts: number;
  version: number;
}

export interface TemplatePage {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  page_size: number;
}

export interface DeliveryPage {
  deliveries: NotificationDelivery[];
  total: number;
  page: number;
  page_size: number;
}
export interface ProviderPage {
  providers: NotificationProvider[];
  total: number;
  page: number;
  page_size: number;
}

export interface TemplateQuery {
  tenantID: string;
  applicationID: string;
  keyword: string;
  channel: string;
  status: string;
  page: number;
  pageSize: number;
}

export interface DeliveryQuery {
  tenantID: string;
  applicationID: string;
  status: string;
  page: number;
  pageSize: number;
}

const notificationRequest = platformRequest('notification');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('notification service returned an empty response');
  return data;
}

export function listTemplates(query: TemplateQuery) {
  return unwrap<TemplatePage>(
    notificationRequest({
      url: '/api/v1/notifications/templates/list',
      method: 'post',
      data: {
        ...applicationScope(query.tenantID, query.applicationID),
        keyword: query.keyword,
        channel: query.channel,
        status: query.status,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function listProviders(query: TemplateQuery) {
  return unwrap<ProviderPage>(
    notificationRequest({
      url: '/api/v1/notifications/providers/list',
      method: 'post',
      data: {
        ...applicationScope(query.tenantID, query.applicationID),
        keyword: query.keyword,
        channel: query.channel,
        status: query.status,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function putProvider(tenantID: string, applicationID: string, value: Partial<NotificationProvider>) {
  return unwrap<NotificationProvider>(
    notificationRequest({
      url: '/api/v1/notifications/providers/put',
      method: 'post',
      data: {
        ...applicationScope(tenantID, applicationID),
        code: value.code,
        channel: value.channel,
        upstream: value.upstream,
        path: value.path,
        priority: value.priority ?? 100,
        status: value.status || 'active',
        expected_version: value.version || 0
      }
    })
  );
}

export function putTemplate(tenantID: string, applicationID: string, value: Partial<NotificationTemplate>) {
  return unwrap<NotificationTemplate>(
    notificationRequest({
      url: '/api/v1/notifications/templates/put',
      method: 'post',
      data: {
        ...applicationScope(tenantID, applicationID),
        code: value.code,
        channel: value.channel,
        locale: value.locale,
        subject: value.subject || '',
        content: value.content,
        status: value.status || 'active',
        expected_version: value.version || 0
      }
    })
  );
}

export function listDeliveries(query: DeliveryQuery) {
  return unwrap<DeliveryPage>(
    notificationRequest({
      url: '/api/v1/notifications/deliveries/list',
      method: 'post',
      data: {
        ...applicationScope(query.tenantID, query.applicationID),
        status: query.status,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function getDelivery(value: Pick<NotificationDelivery, 'id' | 'tenant_id' | 'application_id'>) {
  return unwrap<NotificationDelivery>(
    notificationRequest({
      url: '/api/v1/notifications/deliveries/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
}

export function sendNotification(input: {
  tenantID: string;
  applicationID: string;
  templateCode: string;
  channel: string;
  locale: string;
  recipient: string;
  variables: Record<string, string>;
  idempotencyKey: string;
}) {
  return unwrap<NotificationDelivery>(
    notificationRequest({
      url: '/api/v1/notifications/send',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        template_code: input.templateCode,
        channel: input.channel,
        locale: input.locale,
        recipient: input.recipient,
        variables: input.variables,
        idempotency_key: input.idempotencyKey
      }
    })
  );
}
