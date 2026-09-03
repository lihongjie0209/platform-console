export interface ProviderFormValue {
  code: string;
  channel: string;
  upstream: string;
  path: string;
  priority: number;
  status: string;
}

export function normalizeProviderForm(value: ProviderFormValue): ProviderFormValue {
  return {
    code: value.code.trim().toLowerCase(),
    channel: value.channel.trim().toLowerCase(),
    upstream: value.upstream.trim(),
    path: value.path.trim(),
    priority: Number(value.priority),
    status: value.status.trim().toLowerCase()
  };
}

export function providerFormError(value: ProviderFormValue): string {
  const normalized = normalizeProviderForm(value);
  if (!normalized.code || !/^[a-z0-9][a-z0-9._-]*$/.test(normalized.code)) return '供应商编码格式不正确';
  if (!['email', 'sms', 'webhook', 'in_app'].includes(normalized.channel)) return '通知渠道不正确';
  if (!normalized.upstream) return '请输入已配置的上游名称';
  if (!normalized.path.startsWith('/') || normalized.path.startsWith('//') || normalized.path.includes('#'))
    return '请求路径必须是以单个 / 开头的站内路径';
  if (!Number.isInteger(normalized.priority) || normalized.priority < 0) return '优先级必须是非负整数';
  if (!['active', 'disabled'].includes(normalized.status)) return '供应商状态不正确';
  return '';
}
