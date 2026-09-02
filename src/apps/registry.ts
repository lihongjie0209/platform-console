import type { Component } from 'vue';
import { defineAsyncComponent } from 'vue';
import { auditCenterManifest } from './audit-center/manifest';
import { billingCenterManifest } from './billing-center/manifest';
import { configCenterManifest } from './config-center/manifest';
import { dictionaryCenterManifest } from './dictionary-center/manifest';
import { exportCenterManifest } from './export-center/manifest';
import { fileCenterManifest } from './file-center/manifest';
import { importCenterManifest } from './import-center/manifest';
import { meteringCenterManifest } from './metering-center/manifest';
import { notificationCenterManifest } from './notification-center/manifest';
import { platformAdminManifest } from './platform-admin/manifest';
import { createApplicationRegistry } from './registry-builder';
import { registryCenterManifest } from './registry-center/manifest';
import { ruleCenterManifest } from './rule-center/manifest';
import { schedulerCenterManifest } from './scheduler-center/manifest';
import { searchCenterManifest } from './search-center/manifest';
import { swaggerCenterManifest } from './swagger-center/manifest';
import type { ApplicationManifest } from './types';
import { webhookCenterManifest } from './webhook-center/manifest';
import { workflowCenterManifest } from './workflow-center/manifest';

const manifests: readonly ApplicationManifest[] = [
  platformAdminManifest,
  auditCenterManifest,
  configCenterManifest,
  notificationCenterManifest,
  fileCenterManifest,
  schedulerCenterManifest,
  dictionaryCenterManifest,
  registryCenterManifest,
  swaggerCenterManifest,
  workflowCenterManifest,
  searchCenterManifest,
  meteringCenterManifest,
  billingCenterManifest,
  ruleCenterManifest,
  importCenterManifest,
  exportCenterManifest,
  webhookCenterManifest
];

const registry = createApplicationRegistry(manifests);
const { pageLoaders } = registry;

export type ApplicationPageKey = string;

export const applicationPageOptions = Object.freeze(Array.from(pageLoaders.keys(), value => ({ value, label: value })));

export const applicationModules = registry.modules;

const pageComponents = new Map<string, Component>();

export function pageBelongsToApplication(pageKey: string, applicationCode: string) {
  return pageLoaders.has(pageKey) && pageKey.startsWith(`${applicationCode}.`);
}

export function resolveApplicationPage(pageKey?: string, applicationCode?: string): Component | undefined {
  if (!pageKey || !applicationCode || !pageBelongsToApplication(pageKey, applicationCode)) return undefined;

  let component = pageComponents.get(pageKey);
  if (!component) {
    const loader = pageLoaders.get(pageKey);
    if (!loader) return undefined;
    component = defineAsyncComponent(loader);
    pageComponents.set(pageKey, component);
  }
  return component;
}

export function isApplicationPageKey(pageKey: string): pageKey is ApplicationPageKey {
  return pageLoaders.has(pageKey);
}
