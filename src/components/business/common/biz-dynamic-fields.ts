export function canAddBizDynamicField(length: number, max: number) {
  return length < max;
}

export function canRemoveBizDynamicField(length: number, min: number) {
  return length > min;
}
