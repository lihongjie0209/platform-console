import type { components as AuditContract } from '@/service/contracts/generated/audit';
import { platformRequest } from '@/service/request';

export type AuditRecordContract = AuditContract['schemas']['httptransport.AuditRecordResponseBody'];
export type AuditExportResult = AuditContract['schemas']['httptransport.ExportAuditResponseBody'];

export interface AuditRecord extends AuditRecordContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  request_id: string;
  trace_id: string;
  source_service: string;
  occurred_at: string;
  version: number;
}

export interface AuditQuery {
  tenantID: string;
  actorID?: string;
  actorType?: string;
  action?: string;
  resourceType?: string;
  resourceID?: string;
  requestID?: string;
  traceID?: string;
  sourceService?: string;
  occurredFrom?: string;
  occurredTo?: string;
  page: number;
  pageSize: number;
}

export interface AuditPage {
  records: AuditRecord[];
  total: number;
  page: number;
  page_size: number;
}

const auditRequest = platformRequest('audit');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('audit service returned an empty response');
  return data;
}

function queryPayload(query: AuditQuery) {
  return {
    tenant_id: query.tenantID,
    actor_id: query.actorID || '',
    actor_type: query.actorType || '',
    action: query.action || '',
    resource_type: query.resourceType || '',
    resource_id: query.resourceID || '',
    request_id: query.requestID || '',
    trace_id: query.traceID || '',
    source_service: query.sourceService || '',
    occurred_from: query.occurredFrom || undefined,
    occurred_to: query.occurredTo || undefined,
    page: query.page,
    page_size: query.pageSize
  };
}

export function listAuditRecords(query: AuditQuery) {
  return unwrap<AuditPage>(
    auditRequest({
      url: '/api/v1/audit/records/query',
      method: 'post',
      data: queryPayload(query)
    })
  );
}

export function exportAuditRecords(query: AuditQuery, maxRecords = 10_000) {
  return unwrap<AuditExportResult>(
    auditRequest({
      url: '/api/v1/audit/records/export',
      method: 'post',
      data: { ...queryPayload(query), max_records: maxRecords }
    })
  );
}
