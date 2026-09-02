import type { ApplicationManifest } from '../types';
export const configCenterManifest = {
  code: 'config-center',
  name: '配置中心',
  category: 'data',
  pages: { 'config-center.entries': () => import('./pages/entries/index.vue') }
} satisfies ApplicationManifest;
