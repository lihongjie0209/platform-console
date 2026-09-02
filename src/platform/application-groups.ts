import type { PlatformApplication } from '@/service/api';
import type { ApplicationCategory } from '@/apps/types';
import { applicationModuleFor } from '@/apps/registry';

export interface ApplicationGroup {
  category: ApplicationCategory;
  label: string;
  applications: PlatformApplication[];
}

export interface ApplicationCategoryDetails {
  category: ApplicationCategory;
  label: string;
}

const categories: readonly { category: ApplicationCategory; label: string }[] = [
  { category: 'platform', label: '平台治理' },
  { category: 'operations', label: '平台运维' },
  { category: 'automation', label: '流程与自动化' },
  { category: 'data', label: '数据能力' },
  { category: 'integration', label: '集成能力' },
  { category: 'commerce', label: '计量与商业' },
  { category: 'business', label: '业务应用' }
];
const categoryValues = new Set<ApplicationCategory>(categories.map(item => item.category));

function configuredCategory(application: PlatformApplication): ApplicationCategory | undefined {
  if (!application.metadata_json) return undefined;
  try {
    const metadata: unknown = JSON.parse(application.metadata_json);
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const category = Reflect.get(metadata, 'category');
    return typeof category === 'string' && categoryValues.has(category as ApplicationCategory)
      ? (category as ApplicationCategory)
      : undefined;
  } catch {
    return undefined;
  }
}

export function applicationCategoryDetails(application: PlatformApplication): ApplicationCategoryDetails {
  const category = configuredCategory(application) ?? applicationModuleFor(application.code)?.category ?? 'business';
  return categories.find(item => item.category === category) ?? { category: 'business', label: '业务应用' };
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

  return categories.flatMap(({ category, label }) => {
    const items = grouped.get(category);
    return items?.length ? [{ category, label, applications: items }] : [];
  });
}
