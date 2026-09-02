import type { ApplicationManifest, ApplicationModule, ApplicationPageLoader } from './types';

export interface ApplicationRegistry {
  modules: readonly ApplicationModule[];
  pageLoaders: ReadonlyMap<string, ApplicationPageLoader>;
}

export function createApplicationRegistry(manifests: readonly ApplicationManifest[]): ApplicationRegistry {
  const pageLoaders = new Map<string, ApplicationPageLoader>();
  const applicationCodes = new Set<string>();

  for (const manifest of manifests) {
    if (!manifest.code || applicationCodes.has(manifest.code)) {
      throw new Error(`Duplicate or empty application code: ${manifest.code}`);
    }
    applicationCodes.add(manifest.code);
    for (const [pageKey, loader] of Object.entries(manifest.pages)) {
      if (!pageKey.startsWith(`${manifest.code}.`)) {
        throw new Error(`Page ${pageKey} is outside application namespace ${manifest.code}`);
      }
      if (pageLoaders.has(pageKey)) throw new Error(`Duplicate application page: ${pageKey}`);
      pageLoaders.set(pageKey, loader);
    }
  }

  return {
    pageLoaders,
    modules: Object.freeze(
      manifests.map(manifest => ({
        code: manifest.code,
        name: manifest.name,
        category: manifest.category,
        pages: Object.freeze(Object.keys(manifest.pages))
      }))
    )
  };
}
