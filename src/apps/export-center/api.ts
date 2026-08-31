import type { components as ExportContract } from '@/service/contracts/generated/data-export';
import { platformRequest } from '@/service/request';
export type ExportJob = ExportContract['schemas']['httptransport.ExportJobBody'] & {
  id: string;
  tenant_id: string;
  dataset_code: string;
  provider_service: string;
  format: string;
  filename: string;
  query: Record<string, unknown>;
  selected_columns: string[];
  status: string;
  progress_percent: number;
  version: number;
};
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
const request = platformRequest('data-export');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('export service returned an empty response');
  return data;
}
export const listExports = (input: { tenantID: string; status: string; datasetCode: string }) =>
  unwrap<Page<ExportJob>>(
    request({
      url: '/api/v1/exports/list',
      method: 'post',
      data: {
        tenant_id: input.tenantID,
        status: input.status,
        dataset_code: input.datasetCode,
        page: 1,
        page_size: 100
      }
    })
  );
export const createExport = (input: {
  tenantID: string;
  datasetCode: string;
  providerService: string;
  format: string;
  filename: string;
  query: Record<string, unknown>;
  columns: string[];
}) =>
  unwrap<{ job: ExportJob; duplicate: boolean }>(
    request({
      url: '/api/v1/exports/create',
      method: 'post',
      data: {
        tenant_id: input.tenantID,
        dataset_code: input.datasetCode,
        provider_service: input.providerService,
        format: input.format,
        filename: input.filename,
        query: input.query,
        selected_columns: input.columns,
        idempotency_key: crypto.randomUUID()
      }
    })
  );
export const cancelExport = (job: ExportJob) =>
  unwrap<ExportJob>(
    request({
      url: '/api/v1/exports/cancel',
      method: 'post',
      data: { tenant_id: job.tenant_id, id: job.id, version: job.version }
    })
  );
export const retryExport = (job: ExportJob) =>
  unwrap<{ job: ExportJob; duplicate: boolean }>(
    request({
      url: '/api/v1/exports/retry',
      method: 'post',
      data: { tenant_id: job.tenant_id, id: job.id, version: job.version, idempotency_key: crypto.randomUUID() }
    })
  );
export const downloadExport = (job: ExportJob) =>
  unwrap<{ url: string; filename: string }>(
    request({
      url: '/api/v1/exports/download',
      method: 'post',
      data: { tenant_id: job.tenant_id, id: job.id, ttl_seconds: 300 }
    })
  );
