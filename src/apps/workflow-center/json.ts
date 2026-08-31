export function parseJSONObject(value: string, label = 'JSON'): Record<string, unknown> {
  const normalized = value.trim() || '{}';
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error(`${label} 必须是 JSON 对象`);
  return parsed as Record<string, unknown>;
}
export function parseJSONArray<T>(value: string, label: string): T[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim() || '[]');
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${label} 必须是 JSON 数组`);
  return parsed as T[];
}
