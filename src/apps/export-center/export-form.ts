import type { ExportDataset, ExportDatasetDescriptor } from './api';

export type ExportQueryValue = string | number | boolean | undefined;

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

export function exportQueryDefaults(value: ExportDatasetDescriptor) {
  return Object.fromEntries(
    (value.query_fields || []).filter(field => field.key).map(field => [field.key!, undefined])
  ) as Record<string, ExportQueryValue>;
}

export function buildExportQuery(value: ExportDatasetDescriptor, input: Record<string, ExportQueryValue>) {
  const result: Record<string, string | number | boolean> = {};
  for (const field of value.query_fields || []) {
    if (field.key) {
      const current = input[field.key];
      if (current === undefined || current === '') {
        if (field.required) throw new Error(`${field.title || field.key}不能为空`);
      } else {
        result[field.key] = current;
      }
    }
  }
  return result;
}
