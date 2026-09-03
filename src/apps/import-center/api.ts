import type { components as ImportContract } from '@/service/contracts/generated/import';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
import { catalogSearch } from '@/platform/catalog';
import { paginationRequest } from '@/platform/pagination';
export type ImportDataset = ImportContract['schemas']['httptransport.ImportDatasetSummaryBody'] &
  Record<string, unknown> & {
    provider_service: string;
    code: string;
    title: string;
    formats: string[];
    healthy_instances: number;
  };
export type ImportColumn = ImportContract['schemas']['httptransport.ImportColumnBody'];
export type ImportDatasetDescriptor = ImportContract['schemas']['httptransport.ImportDatasetDescriptorBody'] &
  Record<string, unknown> & {
    code: string;
    title: string;
    formats: string[];
    columns: ImportColumn[];
  };
export type ImportJob = ImportContract['schemas']['httptransport.ImportJobBody'] & {
  id: string;
  tenant_id: string;
  application_id: string;
  dataset_code: string;
  provider_service: string;
  format: string;
  filename: string;
  status: string;
  source_bytes: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  applied_rows: number;
  progress_percent: number;
  error_message: string;
  created_at: string;
  updated_at: string;
  version: number;
};
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
interface UploadResult {
  job: ImportJob;
  upload_url: string;
  upload_headers: Record<string, string>;
  duplicate: boolean;
}
const request = platformRequest('import');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('import service returned an empty response');
  return data;
}
export const listDatasets = (input: {
  tenantID: string;
  applicationID: string;
  search: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<Page<ImportDataset>>(
    request({
      url: '/api/v1/imports/datasets/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        search: catalogSearch(input.search),
        ...paginationRequest(input.page, input.pageSize)
      }
    })
  );
export const describeDataset = (input: {
  tenantID: string;
  applicationID: string;
  providerService: string;
  datasetCode: string;
}) =>
  unwrap<ImportDatasetDescriptor>(
    request({
      url: '/api/v1/imports/datasets/describe',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        provider_service: input.providerService,
        dataset_code: input.datasetCode
      }
    })
  );
export const listImports = (input: {
  tenantID: string;
  applicationID: string;
  status: string;
  datasetCode: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<Page<ImportJob>>(
    request({
      url: '/api/v1/imports/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        dataset_code: input.datasetCode,
        ...paginationRequest(input.page, input.pageSize)
      }
    })
  );
export const getImport = (job: Pick<ImportJob, 'tenant_id' | 'application_id' | 'id'>) =>
  unwrap<ImportJob>(
    request({
      url: '/api/v1/imports/get',
      method: 'post',
      data: { ...applicationScope(job.tenant_id, job.application_id), id: job.id }
    })
  );
export const createImport = (input: {
  tenantID: string;
  applicationID: string;
  dataset: ImportDataset;
  format: string;
  filename: string;
  idempotencyKey: string;
}) =>
  unwrap<UploadResult>(
    request({
      url: '/api/v1/imports/create',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        dataset_code: input.dataset.code,
        provider_service: input.dataset.provider_service,
        format: input.format,
        filename: input.filename,
        idempotency_key: input.idempotencyKey
      }
    })
  );
export async function putImportFile(value: UploadResult, file: File) {
  const headers = new Headers(value.upload_headers || {});
  headers.delete('content-length');
  const response = await fetch(value.upload_url, { method: 'PUT', headers, body: file });
  if (!response.ok) throw new Error(`对象存储上传失败（HTTP ${response.status}）`);
}
export const completeImportUpload = (input: {
  job: ImportJob;
  size: number;
  checksum: string;
  idempotencyKey: string;
}) =>
  unwrap<ImportJob>(
    request({
      url: '/api/v1/imports/complete-upload',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: {
        ...applicationScope(input.job.tenant_id, input.job.application_id),
        id: input.job.id,
        version: input.job.version,
        source_bytes: input.size,
        source_checksum: input.checksum
      }
    })
  );
export const confirmImport = (job: ImportJob, idempotencyKey: string) =>
  unwrap<{ job: ImportJob; duplicate: boolean }>(
    request({
      url: '/api/v1/imports/confirm',
      method: 'post',
      data: {
        ...applicationScope(job.tenant_id, job.application_id),
        id: job.id,
        version: job.version,
        idempotency_key: idempotencyKey
      }
    })
  );
export const cancelImport = (job: ImportJob) =>
  unwrap<ImportJob>(
    request({
      url: '/api/v1/imports/cancel',
      method: 'post',
      data: { ...applicationScope(job.tenant_id, job.application_id), id: job.id, version: job.version }
    })
  );
export const retryImport = (job: ImportJob, idempotencyKey: string) =>
  unwrap<UploadResult>(
    request({
      url: '/api/v1/imports/retry',
      method: 'post',
      data: {
        ...applicationScope(job.tenant_id, job.application_id),
        id: job.id,
        version: job.version,
        idempotency_key: idempotencyKey
      }
    })
  );
export const errorReport = (job: ImportJob) =>
  unwrap<{ url: string; filename: string }>(
    request({
      url: '/api/v1/imports/error-report',
      method: 'post',
      data: { ...applicationScope(job.tenant_id, job.application_id), id: job.id, ttl_seconds: 300 }
    })
  );
