import type { ApplicationManifest } from '../types';
export const searchCenterManifest = {
  code: 'search-center',
  name: '应用搜索',
  category: 'data',
  pages: { 'search-center.search': () => import('./pages/search/index.vue') }
} satisfies ApplicationManifest;
