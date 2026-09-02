import type { ImportColumn, ImportDataset } from './api';

export const importStatusOptions = Object.freeze([
  { value: 'uploading', label: '等待上传' },
  { value: 'queued', label: '排队校验' },
  { value: 'validating', label: '校验中' },
  { value: 'validation_failed', label: '校验未通过' },
  { value: 'ready', label: '等待确认' },
  { value: 'apply_queued', label: '排队导入' },
  { value: 'applying', label: '导入中' },
  { value: 'succeeded', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'canceled', label: '已取消' },
  { value: 'expired', label: '已过期' }
]);

export function importStatusLabel(value: string) {
  return importStatusOptions.find(option => option.value === value)?.label || value;
}

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
