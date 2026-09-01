import type { components as FileContract } from '@/service/contracts/generated/file';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';

type FileContractMetadata = FileContract['schemas']['file.Metadata'];
type FileContractAuthorization = FileContract['schemas']['file.Authorization'];

export interface FileMetadata extends FileContractMetadata, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  filename: string;
  content_type: string;
  size: number;
  status: string;
  scan_status: string;
  version: number;
}

export interface UploadAuthorization extends FileContractAuthorization {
  file: FileMetadata;
  url: string;
  headers: Record<string, string>;
}

export interface FilePage {
  files: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface FileQuery {
  tenantID: string;
  applicationID: string;
  keyword: string;
  status: string;
  scanStatus: string;
  contentType: string;
  ownerID: string;
  page: number;
  pageSize: number;
}

const fileRequest = platformRequest('file');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('file service returned an empty response');
  return data;
}

export function listFiles(query: FileQuery) {
  return unwrap<FilePage>(
    fileRequest({
      url: '/api/v1/files/metadata/list',
      method: 'post',
      data: {
        ...applicationScope(query.tenantID, query.applicationID),
        keyword: query.keyword,
        status: query.status,
        scan_status: query.scanStatus,
        content_type: query.contentType,
        owner_id: query.ownerID,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function initiateUpload(input: {
  tenantID: string;
  applicationID: string;
  filename: string;
  contentType: string;
  size: number;
  checksumSHA256: string;
  idempotencyKey: string;
}) {
  return unwrap<UploadAuthorization>(
    fileRequest({
      url: '/api/v1/files/uploads/initiate',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        filename: input.filename,
        content_type: input.contentType,
        size: input.size,
        checksum_sha256: input.checksumSHA256,
        idempotency_key: input.idempotencyKey
      }
    })
  );
}

export async function putAuthorizedFile(authorization: UploadAuthorization, source: File) {
  const headers = new Headers();
  Object.entries(authorization.headers || {}).forEach(([name, value]) => {
    if (name.toLowerCase() !== 'content-length') headers.set(name, value);
  });
  const response = await fetch(authorization.url, { method: 'PUT', headers, body: source });
  if (!response.ok) throw new Error(`对象存储上传失败（HTTP ${response.status}）`);
}

export function completeUpload(file: FileMetadata, checksumSHA256: string) {
  return unwrap<FileMetadata>(
    fileRequest({
      url: '/api/v1/files/uploads/complete',
      method: 'post',
      data: {
        id: file.id,
        ...applicationScope(file.tenant_id, file.application_id),
        checksum_sha256: checksumSHA256,
        expected_version: file.version
      }
    })
  );
}

export function authorizeDownload(file: FileMetadata) {
  return unwrap<UploadAuthorization>(
    fileRequest({
      url: '/api/v1/files/downloads/authorize',
      method: 'post',
      data: { id: file.id, ...applicationScope(file.tenant_id, file.application_id) }
    })
  );
}

export function deleteFile(file: FileMetadata) {
  return unwrap<FileMetadata>(
    fileRequest({
      url: '/api/v1/files/delete',
      method: 'post',
      data: {
        id: file.id,
        ...applicationScope(file.tenant_id, file.application_id),
        expected_version: file.version
      }
    })
  );
}
