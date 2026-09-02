import type { ApplicationManifest } from '../types';
export const registryCenterManifest = {
  code: 'registry-center',
  name: '服务注册中心',
  pages: { 'registry-center.services': () => import('./pages/services/index.vue') }
} satisfies ApplicationManifest;
