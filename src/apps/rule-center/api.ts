import type { components as RuleContract } from '@/service/contracts/generated/rule';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
type RuleSetSchema = RuleContract['schemas']['httptransport.RuleSetView'];
type RuleVersionSchema = RuleContract['schemas']['httptransport.RuleVersionView'];
export interface RuleSet extends RuleSetSchema, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  published_version_number: number;
  version: number;
}
export interface RuleVersion extends Omit<RuleVersionSchema, 'definition'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  rule_set_id: string;
  version_number: number;
  status: string;
  definition: Record<string, unknown>;
  checksum: string;
  version: number;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
const request = platformRequest('rule');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('rule service returned an empty response');
  return data;
}
export const listRuleSets = (input: {
  tenantID: string;
  applicationID: string;
  status: string;
  keyword: string;
  page: number;
  pageSize: number;
}) =>
  unwrap<Page<RuleSet>>(
    request({
      url: '/api/v1/rule-sets/list',
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
export const getRuleSet = (value: Pick<RuleSet, 'id' | 'tenant_id' | 'application_id'>) =>
  unwrap<RuleSet>(
    request({
      url: '/api/v1/rule-sets/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
export function saveRuleSet(
  current: RuleSet | undefined,
  scope: { tenantID: string; applicationID: string },
  input: { code: string; name: string; description: string; status: string }
) {
  return unwrap<RuleSet>(
    request({
      url: current ? '/api/v1/rule-sets/update' : '/api/v1/rule-sets/create',
      method: 'post',
      data: current
        ? {
            ...applicationScope(scope.tenantID, scope.applicationID),
            id: current.id,
            name: input.name,
            description: input.description,
            status: input.status,
            version: current.version
          }
        : {
            ...applicationScope(scope.tenantID, scope.applicationID),
            code: input.code,
            name: input.name,
            description: input.description
          }
    })
  );
}
export const listRuleVersions = (value: RuleSet, page: number, pageSize: number) =>
  unwrap<Page<RuleVersion>>(
    request({
      url: '/api/v1/rule-versions/list',
      method: 'post',
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        rule_set_id: value.id,
        page,
        page_size: pageSize
      }
    })
  );
export const getRuleVersion = (set: RuleSet, versionID: string) =>
  unwrap<RuleVersion>(
    request({
      url: '/api/v1/rule-versions/get',
      method: 'post',
      data: {
        ...applicationScope(set.tenant_id, set.application_id),
        rule_set_id: set.id,
        id: versionID
      }
    })
  );
export const validateRule = (tenantID: string, applicationID: string, definition: Record<string, unknown>) =>
  unwrap<{ valid: boolean; issues: string[]; checksum: string }>(
    request({
      url: '/api/v1/rule-versions/validate',
      method: 'post',
      data: { ...applicationScope(tenantID, applicationID), definition }
    })
  );
export const createRuleVersion = (value: RuleSet, definition: Record<string, unknown>) =>
  unwrap<{ rule_version: RuleVersion; duplicate: boolean }>(
    request({
      url: '/api/v1/rule-versions/create',
      method: 'post',
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        rule_set_id: value.id,
        definition,
        idempotency_key: crypto.randomUUID()
      }
    })
  );
export const publishRuleVersion = (set: RuleSet, version: RuleVersion) =>
  unwrap<{ rule_set: RuleSet; rule_version: RuleVersion }>(
    request({
      url: '/api/v1/rule-versions/publish',
      method: 'post',
      data: {
        ...applicationScope(set.tenant_id, set.application_id),
        rule_set_id: set.id,
        rule_version_id: version.id,
        rule_set_version: set.version,
        rule_version_version: version.version
      }
    })
  );
export const evaluateRule = (value: RuleSet, facts: Record<string, unknown>) =>
  unwrap<{
    matched: boolean;
    matched_rule: string;
    result: Record<string, unknown>;
    evaluated_version_number: number;
    checksum: string;
  }>(
    request({
      url: '/api/v1/rules/evaluate',
      method: 'post',
      data: {
        ...applicationScope(value.tenant_id, value.application_id),
        rule_set_code: value.code,
        facts
      }
    })
  );
