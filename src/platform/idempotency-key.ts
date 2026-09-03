export type IdempotencyKeyGenerator = () => string;

export function ensureIdempotencyKey(current: string, generate: IdempotencyKeyGenerator = () => crypto.randomUUID()) {
  return current || generate();
}

export function operationIdempotencyKey(
  keys: Map<string, string>,
  operation: string,
  generate?: IdempotencyKeyGenerator
) {
  const key = ensureIdempotencyKey(keys.get(operation) || '', generate);
  keys.set(operation, key);
  return key;
}

export function operationPhaseIdempotencyKey(operationKey: string, phase: string) {
  const key = operationKey.trim();
  const normalizedPhase = phase.trim();
  if (!key || !normalizedPhase) throw new Error('operation key and phase are required');
  return `${key}:${normalizedPhase}`;
}

export function operationValue<Value>(values: Map<string, Value>, operation: string, create: () => Value) {
  if (values.has(operation)) return values.get(operation) as Value;
  const value = create();
  values.set(operation, value);
  return value;
}
