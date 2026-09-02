import type { ApplicationManifest } from '../types';
export const dictionaryCenterManifest = {
  code: 'dictionary-center',
  name: '数据字典',
  category: 'data',
  pages: {
    'dictionary-center.definitions': () => import('./pages/definitions/index.vue'),
    'dictionary-center.providers': () => import('./pages/providers/index.vue')
  }
} satisfies ApplicationManifest;
