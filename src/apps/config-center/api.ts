import type { components as ConfigContract } from '@/service/contracts/generated/config';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';

type ConfigEntryContract = ConfigContract['schemas']['httptransport.ConfigEntryResponseBody'];

export interface ConfigEntry extends ConfigEntryContract, Record<string, unknown> {
  id: string;
  environment: string;
  tenant_id: string;
  application_id: string;
  service: string;
  key: string;
  status: string;
  revision: number;
  rollout_percentage: number;
  published_revision: number;
  version: number;
}

export interface ConfigPage {
  entries: ConfigEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface ConfigScope {
  environment: string;
  tenantID: string;
  applicationID: string;
  service: string;
}

export interface ConfigDraftInput extends ConfigScope {
  id?: string;
  key: string;
  value?: unknown;
  secretRef?: string;
  rolloutPercentage: number;
  expectedVersion?: number;
}

const configRequest = platformRequest('config');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('config service returned an empty response');
  return data;
}

export function listConfigEntries(scope: ConfigScope, page: number, pageSize: number) {
  return unwrap<ConfigPage>(
    configRequest({
      url: '/api/v1/config/entries/list',
      method: 'post',
      data: {
        environment: scope.environment,
        ...applicationScope(scope.tenantID, scope.applicationID),
        service: scope.service,
        page,
        page_size: pageSize
      }
    })
  );
}

export function getConfigEntry(id: string) {
  return unwrap<ConfigEntry>(configRequest({ url: '/api/v1/config/entries/get', method: 'post', data: { id } }));
}

export function putConfigDraft(input: ConfigDraftInput) {
  return unwrap<ConfigEntry>(
    configRequest({
      url: '/api/v1/config/entries/put-draft',
      method: 'post',
      data: {
        id: input.id || '',
        environment: input.environment,
        ...applicationScope(input.tenantID, input.applicationID),
        service: input.service,
        key: input.key,
        value: input.value as Record<string, never> | undefined,
        secret_ref: input.secretRef || '',
        rollout_percentage: input.rolloutPercentage,
        expected_version: input.expectedVersion || 0
      }
    })
  );
}

function transition(path: string, entry: ConfigEntry, comment = '') {
  return unwrap<ConfigEntry>(
    configRequest({
      url: path,
      method: 'post',
      data: { id: entry.id, expected_version: entry.version, comment }
    })
  );
}

export function submitConfig(entry: ConfigEntry) {
  return transition('/api/v1/config/entries/submit', entry);
}

export function approveConfig(entry: ConfigEntry, comment: string) {
  return transition('/api/v1/config/entries/approve', entry, comment);
}

export function rejectConfig(entry: ConfigEntry, comment: string) {
  return transition('/api/v1/config/entries/reject', entry, comment);
}

export function publishConfig(entry: ConfigEntry) {
  return transition('/api/v1/config/entries/publish', entry);
}

export function rollbackConfig(entry: ConfigEntry, targetRevision: number) {
  return unwrap<ConfigEntry>(
    configRequest({
      url: '/api/v1/config/entries/rollback',
      method: 'post',
      data: { id: entry.id, expected_version: entry.version, target_revision: targetRevision }
    })
  );
}
