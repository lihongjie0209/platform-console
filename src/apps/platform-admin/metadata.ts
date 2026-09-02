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
