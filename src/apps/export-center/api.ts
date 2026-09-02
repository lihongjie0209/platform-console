import type { components as ExportContract } from '@/service/contracts/generated/data-export';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
export type ExportJob = ExportContract['schemas']['httptransport.ExportJobBody'] & {
  id: string;
  tenant_id: string;
  application_id: string;
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
export type ExportDataset = ExportContract['schemas']['httptransport.ExportDatasetSummaryBody'] & {
  provider_service: string;
  code: string;
  title: string;
  formats: string[];
  healthy_instances: number;
};
export type ExportDatasetDescriptor = ExportContract['schemas']['httptransport.ExportDatasetDescriptorBody'] & {
  code: string;
  title: string;
  formats: string[];
  columns: Array<{ key?: string; title?: string; type?: string; format?: string; sensitive?: boolean }>;
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
export const listExports = (input: { tenantID: string; applicationID: string; status: string; datasetCode: string }) =>
  unwrap<Page<ExportJob>>(
    request({
      url: '/api/v1/exports/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        dataset_code: input.datasetCode,
        page: 1,
        page_size: 100
      }
    })
  );
export const listExportDatasets = (tenantID: string, applicationID: string, search = '') =>
  unwrap<Page<ExportDataset>>(
    request({
      url: '/api/v1/exports/datasets/list',
      method: 'post',
      data: { ...applicationScope(tenantID, applicationID), search, page: 1, page_size: 100 }
    })
  );
export const describeExportDataset = (input: {
  tenantID: string;
  applicationID: string;
  providerService: string;
  datasetCode: string;
}) =>
  unwrap<ExportDatasetDescriptor>(
    request({
      url: '/api/v1/exports/datasets/describe',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        provider_service: input.providerService,
        dataset_code: input.datasetCode
      }
    })
  );
export const createExport = (input: {
  tenantID: string;
  applicationID: string;
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
        ...applicationScope(input.tenantID, input.applicationID),
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
      data: { ...applicationScope(job.tenant_id, job.application_id), id: job.id, version: job.version }
    })
  );
export const retryExport = (job: ExportJob) =>
  unwrap<{ job: ExportJob; duplicate: boolean }>(
    request({
      url: '/api/v1/exports/retry',
      method: 'post',
      data: {
        ...applicationScope(job.tenant_id, job.application_id),
        id: job.id,
        version: job.version,
        idempotency_key: crypto.randomUUID()
      }
    })
  );
export const downloadExport = (job: ExportJob) =>
  unwrap<{ url: string; filename: string }>(
    request({
      url: '/api/v1/exports/download',
      method: 'post',
      data: { ...applicationScope(job.tenant_id, job.application_id), id: job.id, ttl_seconds: 300 }
    })
  );
