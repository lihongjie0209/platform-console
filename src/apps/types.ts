import type { Component } from 'vue';

export type ApplicationPageLoader = () => Promise<{ default: Component }>;

export interface ApplicationManifest {
  code: string;
  name: string;
  pages: Readonly<Record<string, ApplicationPageLoader>>;
}

export interface ApplicationModule {
  code: string;
  name: string;
  pages: readonly string[];
}
