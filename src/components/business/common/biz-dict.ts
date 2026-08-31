import type { TagProps } from 'element-plus';

export interface BizDictOption<Value = string | number | boolean> {
  label: string;
  value: Value;
  tagType?: TagProps['type'];
}

export function findBizDictOption<Value>(options: BizDictOption<Value>[], value: Value) {
  return options.find(option => option.value === value);
}
