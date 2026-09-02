import type { ApplicationManifest } from '../types';
export const exportCenterManifest = {
  code: 'export-center',
  name: '数据导出',
  category: 'integration',
  pages: { 'export-center.jobs': () => import('./pages/jobs/index.vue') }
} satisfies ApplicationManifest;
