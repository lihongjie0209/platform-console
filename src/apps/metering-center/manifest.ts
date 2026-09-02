import type { ApplicationManifest } from '../types';
export const meteringCenterManifest = {
  code: 'metering-center',
  name: '计量中心',
  category: 'commerce',
  pages: {
    'metering-center.meters': () => import('./pages/meters/index.vue'),
    'metering-center.usage': () => import('./pages/usage/index.vue')
  }
} satisfies ApplicationManifest;
