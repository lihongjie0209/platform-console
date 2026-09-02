import type { ApplicationManifest } from '../types';
export const fileCenterManifest = {
  code: 'file-center',
  name: '文件中心',
  pages: { 'file-center.files': () => import('./pages/files/index.vue') }
} satisfies ApplicationManifest;
