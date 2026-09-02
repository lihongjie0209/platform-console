import type { ApplicationCategory } from '../types';

export const applicationCategoryOptions: readonly { label: string; value: ApplicationCategory }[] = [
  { label: '平台治理', value: 'platform' },
  { label: '平台运维', value: 'operations' },
  { label: '流程与自动化', value: 'automation' },
  { label: '数据能力', value: 'data' },
  { label: '集成能力', value: 'integration' },
  { label: '计量与商业', value: 'commerce' },
  { label: '业务应用', value: 'business' }
];

const applicationCategories = new Set<ApplicationCategory>(applicationCategoryOptions.map(option => option.value));

export function parseJSONRecord(value: string, fieldName = 'JSON value'): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function parseJSONObject(value: string): Record<string, unknown> {
  return parseJSONRecord(value, 'metadata_json');
}

export function applicationCategoryFromMetadata(value: string): ApplicationCategory {
  try {
    const category = Reflect.get(parseJSONObject(value), 'category');
    return typeof category === 'string' && applicationCategories.has(category as ApplicationCategory)
      ? (category as ApplicationCategory)
      : 'business';
  } catch {
    return 'business';
  }
}

export function applicationMetadata(value: string, category: ApplicationCategory): Record<string, unknown> {
  const metadata = parseJSONObject(value);
  metadata.category = applicationCategories.has(category) ? category : 'business';
  return metadata;
}

export function applicationCodeError(value: unknown) {
  const code = String(value || '')
    .trim()
    .toLowerCase();
  const normalizedRouteSegment = code.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!/^[a-z][a-z0-9._-]{1,127}$/.test(code) || normalizedRouteSegment !== code) {
    return '应用编码需为 2-128 位小写字母、数字或单个连字符，并以字母开头';
  }
  return '';
}
