import type { ImportDataset } from './api';

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
