import type { components as SearchContract } from '@/service/contracts/generated/search';
import { platformRequest } from '@/service/request';
import { applicationFilterScope } from '@/platform/application-context';
type PageSchema = SearchContract['schemas']['httptransport.SearchPageDTO'];
export type SearchHit = SearchContract['schemas']['httptransport.SearchHitDTO'];
export type SearchFacet = SearchContract['schemas']['httptransport.FacetDTO'];
export interface SearchPage extends PageSchema {
  items: SearchHit[];
  facets: SearchFacet[];
  total: number;
  page: number;
  page_size: number;
  took_milliseconds: number;
}
const request = platformRequest('search');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('search service returned an empty response');
  return data;
}
export function searchDocuments(input: {
  tenantID: string;
  applicationID: string;
  query: string;
  documentTypes: string[];
  sort: string;
  page: number;
  pageSize: number;
}) {
  const scope = applicationFilterScope(input.tenantID, input.applicationID);
  return unwrap<SearchPage>(
    request({
      url: '/api/v1/search/query',
      method: 'post',
      data: {
        ...scope,
        query: input.query,
        document_types: input.documentTypes,
        filters: {},
        sort: input.sort,
        page: input.page,
        page_size: input.pageSize,
        facet_fields: ['document_type', 'source_service', 'application_id']
      }
    })
  );
}
export function suggestDocuments(tenantID: string, applicationID: string, prefix: string) {
  const scope = applicationFilterScope(tenantID, applicationID);
  return unwrap<{ items: Array<{ text: string; document_type: string; source_id: string; url: string }> }>(
    request({
      url: '/api/v1/search/suggest',
      method: 'post',
      data: { ...scope, prefix, limit: 10 }
    })
  );
}
