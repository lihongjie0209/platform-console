import { ensureIdempotencyKey } from '@/platform/idempotency-key';
import type { IdempotencyKeyGenerator } from '@/platform/idempotency-key';
import type { BizCrudMutationContext } from './types';

export function createBizCrudMutationIntent(generate?: IdempotencyKeyGenerator) {
  let fingerprint = '';
  let idempotencyKey = '';

  function context(operation: string, payload: unknown): BizCrudMutationContext {
    const nextFingerprint = JSON.stringify([operation, payload]);
    if (nextFingerprint !== fingerprint) {
      fingerprint = nextFingerprint;
      idempotencyKey = '';
    }
    idempotencyKey = ensureIdempotencyKey(idempotencyKey, generate);
    return { idempotencyKey };
  }

  function reset() {
    fingerprint = '';
    idempotencyKey = '';
  }

  return { context, reset };
}
