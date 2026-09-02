export function formatPlatformBytes(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value < 0) return '-';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = -1;
  do {
    size /= 1024;
    unit += 1;
  } while (size >= 1024 && unit < units.length - 1);
  return `${Number(size.toFixed(2))} ${units[unit]}`;
}
