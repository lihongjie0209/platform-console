export interface BizRemoteOption<Value = string | number> {
  label: string;
  value: Value;
  disabled?: boolean;
}

export interface BizRemoteLoadResult<Value = string | number> {
  items: BizRemoteOption<Value>[];
  total?: number;
  hasMore?: boolean;
}

export function mergeBizRemoteOptions<Value>(current: BizRemoteOption<Value>[], incoming: BizRemoteOption<Value>[]) {
  const options = new Map(current.map(item => [item.value, item]));
  incoming.forEach(item => options.set(item.value, item));
  return Array.from(options.values());
}
