export function parseConfigJSON(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('配置值不是合法 JSON');
  }
}

export function validateSecretReference(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error('Secret 引用不能为空');
  return normalized;
}
