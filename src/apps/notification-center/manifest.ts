import type { ApplicationManifest } from '../types';
export const notificationCenterManifest = {
  code: 'notification-center',
  name: '通知中心',
  category: 'integration',
  pages: {
    'notification-center.templates': () => import('./pages/templates/index.vue'),
    'notification-center.deliveries': () => import('./pages/deliveries/index.vue')
  }
} satisfies ApplicationManifest;
