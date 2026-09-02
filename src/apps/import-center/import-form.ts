import type { ImportColumn, ImportDataset } from './api';

export function importDatasetKey(value: Pick<ImportDataset, 'provider_service' | 'code'>) {
  return `${value.provider_service}\u0000${value.code}`;
}

export function selectedImportDataset(values: ImportDataset[], key: string) {
  return values.find(value => importDatasetKey(value) === key);
}

export function supportedImportFormat(value: ImportDataset | undefined, current = '') {
  if (!value) return '';
  return value.formats.includes(current) ? current : value.formats[0] || '';
}

export function importTemplateCSV(columns: ImportColumn[]) {
  const visible = columns.filter(column => column.key);
  const escape = (value: string) => (/[,"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
  const header = visible.map(column => escape(column.key || '')).join(',');
  const examples = visible.map(column => escape(column.example || '')).join(',');
  const hasExamples = visible.some(column => Boolean(column.example));
  return hasExamples ? `${header}\r\n${examples}\r\n` : `${header}\r\n`;
}
