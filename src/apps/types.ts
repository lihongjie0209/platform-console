import type { Component } from 'vue';

export type ApplicationPageLoader = () => Promise<{ default: Component }>;

export type ApplicationCategory =
  | 'platform'
  | 'operations'
  | 'automation'
  | 'data'
  | 'integration'
  | 'commerce'
  | 'business';

export interface ApplicationManifest {
  code: string;
  name: string;
  category: ApplicationCategory;
  pages: Readonly<Record<string, ApplicationPageLoader>>;
}

export interface ApplicationModule {
  code: string;
  name: string;
  category: ApplicationCategory;
  pages: readonly string[];
}
