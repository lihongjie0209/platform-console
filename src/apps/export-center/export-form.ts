import type { ExportDataset, ExportDatasetDescriptor } from './api';

export function datasetKey(value: Pick<ExportDataset, 'provider_service' | 'code'>) {
  return `${value.provider_service}\u0000${value.code}`;
}

export function findDataset(values: ExportDataset[], key: string) {
  return values.find(value => datasetKey(value) === key);
}

export function descriptorDefaults(value: ExportDatasetDescriptor) {
  return {
    format: value.formats[0] || '',
    columns: value.columns.map(column => column.key || '').filter(Boolean)
  };
}
