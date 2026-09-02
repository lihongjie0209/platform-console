import type { ApplicationManifest } from '../types';
export const swaggerCenterManifest = {
  code: 'swagger-center',
  name: 'API 文档中心',
  pages: { 'swagger-center.documents': () => import('./pages/documents/index.vue') }
} satisfies ApplicationManifest;
