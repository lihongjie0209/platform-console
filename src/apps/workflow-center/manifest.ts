import type { ApplicationManifest } from '../types';
export const workflowCenterManifest = {
  code: 'workflow-center',
  name: '工作流中心',
  pages: {
    'workflow-center.definitions': () => import('./pages/definitions/index.vue'),
    'workflow-center.instances': () => import('./pages/instances/index.vue'),
    'workflow-center.tasks': () => import('./pages/tasks/index.vue')
  }
} satisfies ApplicationManifest;
