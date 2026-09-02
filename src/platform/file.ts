import { createSHA256 } from 'hash-wasm';

const DEFAULT_CHECKSUM_CHUNK_SIZE = 4 * 1024 * 1024;

export async function sha256Hex(value: Blob): Promise<string> {
  const hasher = await createSHA256();
  hasher.init();

  async function updateChunk(offset: number): Promise<void> {
    if (offset >= value.size) return;
    const chunk = value.slice(offset, Math.min(offset + DEFAULT_CHECKSUM_CHUNK_SIZE, value.size));
    hasher.update(new Uint8Array(await chunk.arrayBuffer()));
    await updateChunk(offset + DEFAULT_CHECKSUM_CHUNK_SIZE);
  }

  await updateChunk(0);
  return hasher.digest('hex');
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}
