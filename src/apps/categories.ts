import type { ApplicationCategory } from './types';

export const applicationCategories: readonly { category: ApplicationCategory; label: string }[] = [
  { category: 'platform', label: '平台治理' },
  { category: 'operations', label: '平台运维' },
  { category: 'automation', label: '流程与自动化' },
  { category: 'data', label: '数据能力' },
  { category: 'integration', label: '集成能力' },
  { category: 'commerce', label: '计量与商业' },
  { category: 'business', label: '业务应用' }
];

const categoryValues = new Set<ApplicationCategory>(applicationCategories.map(item => item.category));

export const applicationCategoryOptions = Object.freeze(
  applicationCategories.map(({ category, label }) => ({ value: category, label }))
);

export function isApplicationCategory(value: unknown): value is ApplicationCategory {
  return typeof value === 'string' && categoryValues.has(value as ApplicationCategory);
}

export function applicationCategoryLabel(category: ApplicationCategory) {
  return applicationCategories.find(item => item.category === category)?.label || '业务应用';
}
