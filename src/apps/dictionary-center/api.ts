import type { components as DictionaryContract } from '@/service/contracts/generated/dictionary';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';

type DictionarySchema = DictionaryContract['schemas']['httptransport.DictionaryView'];
type ItemSchema = DictionaryContract['schemas']['httptransport.ItemView'];
type ProviderSchema = DictionaryContract['schemas']['httptransport.ProviderView'];

export interface DictionaryDefinition extends Omit<DictionarySchema, 'metadata_json'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  code: string;
  name: string;
  description: string;
  kind: string;
  status: string;
  published_version: number;
  version: number;
  metadata_json: Record<string, unknown>;
}
export interface DictionaryItem extends Omit<ItemSchema, 'metadata_json'>, Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  parent_id: string;
  parent_code: string;
  status: string;
  metadata_json: Record<string, unknown>;
  leaf: boolean;
  disabled: boolean;
  sort_order: number;
  version: number;
}
export interface DictionaryProvider extends Omit<ProviderSchema, 'capabilities_json'>, Record<string, unknown> {
  id: string;
  service_name: string;
  target: string;
  status: string;
  capabilities_json: Record<string, unknown>[];
  cache_ttl_seconds: number;
  timeout_milliseconds: number;
  lease_expires_at: string;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const request = platformRequest('dictionary');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('dictionary service returned an empty response');
  return data;
}
export function listDefinitions(input: {
  tenantID: string;
  applicationID: string;
  status: string;
  keyword: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<DictionaryDefinition>>(
    request({
      url: '/api/v1/dictionaries/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        keyword: input.keyword,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function createDefinition(input: {
  tenantID: string;
  applicationID: string;
  code: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  return unwrap<DictionaryDefinition>(
    request({
      url: '/api/v1/dictionaries/create',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        code: input.code,
        name: input.name,
        description: input.description,
        metadata_json: input.metadata
      }
    })
  );
}
export function updateDefinition(
  value: DictionaryDefinition,
  input: { name: string; description: string; status: string; metadata: Record<string, unknown> }
) {
  return unwrap<DictionaryDefinition>(
    request({
      url: '/api/v1/dictionaries/update',
      method: 'post',
      data: {
        id: value.id,
        version: value.version,
        name: input.name,
        description: input.description,
        status: input.status,
        metadata_json: input.metadata
      }
    })
  );
}
export function listDraftItems(dictionaryID: string) {
  return unwrap<{ items: DictionaryItem[] }>(
    request({ url: '/api/v1/dictionaries/items/list', method: 'post', data: { dictionary_id: dictionaryID } })
  );
}
export function upsertItem(dictionaryID: string, item: Partial<DictionaryItem> & { code: string; name: string }) {
  return unwrap<{ items: DictionaryItem[] }>(
    request({
      url: '/api/v1/dictionaries/items/upsert',
      method: 'post',
      data: {
        dictionary_id: dictionaryID,
        items: [
          {
            id: item.id || '',
            code: item.code,
            name: item.name,
            parent_id: item.parent_id || '',
            parent_code: item.parent_code || '',
            status: item.status || 'active',
            metadata_json: item.metadata_json || {},
            leaf: item.leaf ?? true,
            disabled: item.disabled ?? false,
            sort_order: item.sort_order || 0,
            version: item.version || 0
          }
        ]
      }
    })
  );
}
export function deleteItem(item: DictionaryItem) {
  return unwrap<Record<string, never>>(
    request({ url: '/api/v1/dictionaries/items/delete', method: 'post', data: { id: item.id, version: item.version } })
  );
}
export function publishDefinition(value: DictionaryDefinition, comment: string) {
  return unwrap<{ release_version: number; items: DictionaryItem[] }>(
    request({
      url: '/api/v1/dictionaries/publish',
      method: 'post',
      data: { dictionary_id: value.id, dictionary_version: value.version, comment }
    })
  );
}
export function queryDictionary(input: {
  tenantID: string;
  applicationID: string;
  dictionaryCode: string;
  keyword: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<DictionaryItem> & { has_more: boolean }>(
    request({
      url: '/api/v1/dictionaries/query',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        dictionary_code: input.dictionaryCode,
        keyword: input.keyword,
        page: input.page,
        page_size: input.pageSize,
        filters: {}
      }
    })
  );
}
export function listProviders(status: string, page: number, pageSize: number) {
  return unwrap<Page<DictionaryProvider>>(
    request({ url: '/api/v1/dictionaries/providers/list', method: 'post', data: { status, page, page_size: pageSize } })
  );
}
