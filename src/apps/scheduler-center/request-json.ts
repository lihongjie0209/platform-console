export function normalizeRequestJSON(value: string): string {
  const normalized = value.trim() || '{}';
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error('gRPC 请求不是合法 JSON');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('gRPC 请求必须是 JSON 对象');
  }
  return JSON.stringify(parsed);
}
