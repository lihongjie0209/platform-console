import type { components as SwaggerContract } from '@/service/contracts/generated/swagger';
import { platformRequest } from '@/service/request';

type SwaggerServiceSchema = SwaggerContract['schemas']['catalog.Source'];
type SwaggerServicesSchema = SwaggerContract['schemas']['httptransport.SwaggerServicesBody'];
type SwaggerSpecSchema = SwaggerContract['schemas']['httptransport.SwaggerSpecBody'];

export interface SwaggerService extends SwaggerServiceSchema {
  name: string;
  title: string;
  origin: 'static' | 'kubernetes' | string;
  available: boolean;
  updated_at?: string;
  error?: string;
}

export interface SwaggerServicesBody extends SwaggerServicesSchema {
  items: SwaggerService[];
  total: number;
  page: number;
  page_size: number;
}

export interface SwaggerSpecBody extends SwaggerSpecSchema {
  name: string;
  document: Record<string, unknown>;
}

const request = platformRequest('swagger');

async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('swagger service returned an empty response');
  return data;
}

export function listSwaggerServices(query: { keyword: string; page: number; pageSize: number }) {
  return unwrap<SwaggerServicesBody>(
    request({
      url: '/api/v1/swagger/services',
      method: 'post',
      data: { keyword: query.keyword, page: query.page, page_size: query.pageSize }
    })
  );
}

export function getSwaggerSpec(name: string) {
  return unwrap<SwaggerSpecBody>(request({ url: '/api/v1/swagger/spec', method: 'post', data: { name } }));
}
