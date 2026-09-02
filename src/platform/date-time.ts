const platformTimeZone = 'Asia/Shanghai';

export function formatPlatformDateTime(value: string | number | Date | undefined | null) {
  if (value === undefined || value === null || value === '') return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: platformTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function formatPlatformTableDateTime(_row: unknown, _column: unknown, value: unknown) {
  return formatPlatformDateTime(
    value instanceof Date || ['string', 'number'].includes(typeof value) ? (value as string | number | Date) : undefined
  );
}
