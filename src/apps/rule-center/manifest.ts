import type { ApplicationManifest } from '../types';
export const ruleCenterManifest = {
  code: 'rule-center',
  name: '规则中心',
  category: 'automation',
  pages: { 'rule-center.rules': () => import('./pages/rules/index.vue') }
} satisfies ApplicationManifest;
