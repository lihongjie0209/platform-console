type RequestBody = Record<string, unknown>;

function bodyIdempotencyKey(data: unknown) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || data instanceof FormData) return '';
  const value = (data as RequestBody).idempotency_key;
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveRequestIdempotencyKey(
  data: unknown,
  currentHeader: string | undefined,
  generate: () => string = () => crypto.randomUUID()
) {
  return currentHeader?.trim() || bodyIdempotencyKey(data) || generate();
}
