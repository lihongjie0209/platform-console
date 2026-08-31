export function parseJSONObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('metadata_json must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}
