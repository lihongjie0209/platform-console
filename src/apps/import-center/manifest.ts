import type { ApplicationManifest } from '../types';
export const importCenterManifest = {
  code: 'import-center',
  name: '数据导入',
  category: 'integration',
  pages: { 'import-center.jobs': () => import('./pages/jobs/index.vue') }
} satisfies ApplicationManifest;
