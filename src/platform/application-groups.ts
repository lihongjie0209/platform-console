import type { PlatformApplication } from '@/service/api';
import type { ApplicationCategory } from '@/apps/types';
import { applicationModuleFor } from '@/apps/registry';
import { applicationCategories, applicationCategoryLabel, isApplicationCategory } from '@/apps/categories';

export interface ApplicationGroup {
  category: ApplicationCategory;
  label: string;
  applications: PlatformApplication[];
}

export interface ApplicationCategoryDetails {
  category: ApplicationCategory;
  label: string;
}

function configuredCategory(application: PlatformApplication): ApplicationCategory | undefined {
  if (!application.metadata_json) return undefined;
  try {
    const metadata: unknown = JSON.parse(application.metadata_json);
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const category = Reflect.get(metadata, 'category');
    return isApplicationCategory(category) ? category : undefined;
  } catch {
    return undefined;
  }
}

export function applicationCategoryDetails(application: PlatformApplication): ApplicationCategoryDetails {
  const category = configuredCategory(application) ?? applicationModuleFor(application.code)?.category ?? 'business';
  return { category, label: applicationCategoryLabel(category) };
}

/** Groups the granted application catalog by product boundary, not by backend service dependency. */
export function groupApplications(applications: PlatformApplication[]): ApplicationGroup[] {
  const grouped = new Map<ApplicationCategory, PlatformApplication[]>();
  for (const application of applications) {
    const { category } = applicationCategoryDetails(application);
    const items = grouped.get(category) ?? [];
    items.push(application);
    grouped.set(category, items);
  }

  return applicationCategories.flatMap(({ category, label }) => {
    const items = grouped.get(category);
    return items?.length ? [{ category, label, applications: items }] : [];
  });
}
