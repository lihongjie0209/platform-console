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
