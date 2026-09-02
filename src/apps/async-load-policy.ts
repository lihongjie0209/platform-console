const retryableLoadErrors = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'loading chunk',
  'chunkloaderror'
];

export function shouldRetryApplicationLoad(error: unknown, attempts: number) {
  if (attempts >= 2) return false;
  const message = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : String(error).toLowerCase();
  return retryableLoadErrors.some(pattern => message.includes(pattern));
}
