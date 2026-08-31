export function parseNotificationVariables(value: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('变量不是合法 JSON');
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('变量必须是 JSON 对象');
  const entries = Object.entries(parsed);
  if (entries.some(([, item]) => typeof item !== 'string')) throw new Error('变量值必须全部是字符串');
  return Object.fromEntries(entries) as Record<string, string>;
}
