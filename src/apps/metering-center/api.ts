import { platformRequest } from '@/service/request';

export interface Meter extends Record<string, unknown> {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  aggregation: string;
  dimension_keys: string[];
  status: string;
  version: number;
}
export interface UsagePoint extends Record<string, unknown> {
  bucket_start: string;
  quantity: number;
  dimensions: Record<string, string>;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
const request = platformRequest('metering');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('metering service returned an empty response');
  return data;
}
export function listMeters(input: { status: string; keyword: string; page: number; pageSize: number }) {
  return unwrap<Page<Meter>>(
    request({
      url: '/api/v1/meters/list',
      method: 'post',
      data: { ...input, page_size: input.pageSize }
    })
  );
}
export function saveMeter(
  current: Meter | undefined,
  input: {
    code: string;
    name: string;
    description: string;
    unit: string;
    aggregation: string;
    dimensionKeys: string[];
    status: string;
  }
) {
  return unwrap<Meter>(
    request({
      url: current ? '/api/v1/meters/update' : '/api/v1/meters/create',
      method: 'post',
      data: current
        ? {
            id: current.id,
            name: input.name,
            description: input.description,
            status: input.status,
            version: current.version
          }
        : {
            code: input.code,
            name: input.name,
            description: input.description,
            unit: input.unit,
            aggregation: input.aggregation,
            dimension_keys: input.dimensionKeys
          }
    })
  );
}
export function queryUsage(input: {
  tenantID: string;
  meterCode: string;
  startAt: string;
  endAt: string;
  dimensions: Record<string, string>;
  granularity: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<UsagePoint> & { total_quantity: number }>(
    request({
      url: '/api/v1/usage/query',
      method: 'post',
      data: {
        tenant_id: input.tenantID,
        meter_code: input.meterCode,
        start_at: input.startAt,
        end_at: input.endAt,
        dimensions: input.dimensions,
        granularity: input.granularity,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
