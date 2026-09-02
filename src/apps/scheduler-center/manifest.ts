import type { ApplicationManifest } from '../types';
export const schedulerCenterManifest = {
  code: 'scheduler-center',
  name: '调度中心',
  pages: { 'scheduler-center.jobs': () => import('./pages/jobs/index.vue') }
} satisfies ApplicationManifest;
