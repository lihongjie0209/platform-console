export type BizExportTaskStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface BizExportTaskResult {
  id: string;
  status: BizExportTaskStatus;
  downloadUrl?: string;
  message?: string;
}

export function isBizExportTaskFinished(task: BizExportTaskResult) {
  return task.status === 'success' || task.status === 'failed';
}
