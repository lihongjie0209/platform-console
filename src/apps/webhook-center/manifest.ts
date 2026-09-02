import type { ApplicationManifest } from '../types';
export const webhookCenterManifest = {
  code: 'webhook-center',
  name: 'Webhook 中心',
  category: 'integration',
  pages: {
    'webhook-center.subscriptions': () => import('./pages/subscriptions/index.vue'),
    'webhook-center.deliveries': () => import('./pages/deliveries/index.vue')
  }
} satisfies ApplicationManifest;
