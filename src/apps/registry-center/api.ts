import type { components as RegistryContract } from '@/service/contracts/generated/service-registry';
import { platformRequest } from '@/service/request';

type ServiceSchema = RegistryContract['schemas']['httptransport.ServiceSummaryBody'];
type InstanceSchema = RegistryContract['schemas']['httptransport.InstanceBody'];
export interface ServiceSummary extends ServiceSchema, Record<string, unknown> {
  service_name: string;
  healthy_instances: number;
  draining_instances: number;
}
export interface ServiceInstance extends InstanceSchema, Record<string, unknown> {
  instance_id: string;
  service_name: string;
  endpoint: string;
  protocol: string;
  status: string;
  weight: number;
  version: string;
  metadata: Record<string, string>;
  lease_expires_at: string;
}
const request = platformRequest('service-registry');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('service registry returned an empty response');
  return data;
}
export function listServices(prefix: string) {
  return unwrap<{ services: ServiceSummary[]; revision: number }>(
    request({ url: '/api/v1/registry/services/list', method: 'post', data: { prefix } })
  );
}
export function listInstances(serviceName: string, metadata: Record<string, string>, includeDraining: boolean) {
  return unwrap<{ instances: ServiceInstance[]; revision: number }>(
    request({
      url: '/api/v1/registry/instances/list',
      method: 'post',
      data: { service_name: serviceName, metadata, include_draining: includeDraining }
    })
  );
}
