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
