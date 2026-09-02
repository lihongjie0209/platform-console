import type { ApplicationManifest } from '../types';
export const billingCenterManifest = {
  code: 'billing-center',
  name: '计费中心',
  pages: {
    'billing-center.plans': () => import('./pages/plans/index.vue'),
    'billing-center.subscriptions': () => import('./pages/subscriptions/index.vue'),
    'billing-center.invoices': () => import('./pages/invoices/index.vue'),
    'billing-center.payments': () => import('./pages/payments/index.vue')
  }
} satisfies ApplicationManifest;
