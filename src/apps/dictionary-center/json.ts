export function parseJSONObject(value: string): Record<string, unknown> {
  const normalized = value.trim() || '{}';
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('元数据不是合法 JSON');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('元数据必须是 JSON 对象');
  return parsed as Record<string, unknown>;
}
