import type { ApplicationManifest } from '../types';
export const auditCenterManifest = {
  code: 'audit-center',
  name: '审计中心',
  category: 'operations',
  pages: { 'audit-center.records': () => import('./pages/records/index.vue') }
} satisfies ApplicationManifest;
