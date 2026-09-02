import type { PublishedNavigation } from '@/service/api/platform-navigation';
import { applicationEntryDecision, applicationMenuEntries, applicationWorkspacePath } from './navigation';

const maxSearchResults = 50;

export interface ApplicationSearchResult {
  key: string;
  applicationId: string;
  applicationName: string;
  label: string;
  code: string;
  icon: string;
  routePath: string;
}

interface ApplicationSearchInput {
  navigations: PublishedNavigation[];
  keyword: string;
  selectedApplicationId: string;
}

export function searchApplicationNavigation({
  navigations,
  keyword,
  selectedApplicationId
}: ApplicationSearchInput): ApplicationSearchResult[] {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return [];

  return navigations
    .filter(navigation => applicationEntryDecision(navigation).status === 'ready')
    .sort(
      (left, right) =>
        Number(right.application.id === selectedApplicationId) -
          Number(left.application.id === selectedApplicationId) ||
        (left.application.sort_order ?? 0) - (right.application.sort_order ?? 0) ||
        left.application.name.localeCompare(right.application.name, 'zh-CN')
    )
    .flatMap(navigation => {
      const { application } = navigation;
      const results: ApplicationSearchResult[] = [];
      const applicationText = `${application.name} ${application.code}`.toLocaleLowerCase();
      if (applicationText.includes(normalized)) {
        results.push({
          key: `${application.id}:__workspace__`,
          applicationId: application.id,
          applicationName: application.name,
          label: '应用概览',
          code: application.code,
          icon: application.icon || 'mdi:view-dashboard-outline',
          routePath: applicationWorkspacePath(application)
        });
      }
      for (const entry of applicationMenuEntries(navigation)) {
        const searchText = `${application.name} ${application.code} ${entry.name} ${entry.code}`.toLocaleLowerCase();
        if (entry.available && searchText.includes(normalized)) {
          results.push({
            key: `${application.id}:${entry.id}`,
            applicationId: application.id,
            applicationName: application.name,
            label: entry.name,
            code: entry.code,
            icon: entry.icon,
            routePath: entry.path
          });
        }
      }
      return results;
    })
    .slice(0, maxSearchResults);
}
