export interface PermissionCatalogItem {
  code: string;
  name?: string;
  resource_type?: string;
  action?: string;
  status?: string;
}

export interface PermissionCatalogOption {
  code: string;
  label: string;
}

export function buildPermissionCatalogOptions(items: PermissionCatalogItem[], currentCode = '') {
  const options = new Map<string, PermissionCatalogOption>();
  for (const item of items) {
    const code = item.code.trim();
    if (code && (!item.status || item.status === 'active') && !options.has(code)) {
      const detail = [item.name?.trim(), item.resource_type?.trim(), item.action?.trim()].filter(Boolean).join(' · ');
      options.set(code, { code, label: detail ? `${code} — ${detail}` : code });
    }
  }

  const normalizedCurrent = currentCode.trim();
  if (normalizedCurrent && !options.has(normalizedCurrent)) {
    options.set(normalizedCurrent, { code: normalizedCurrent, label: `${normalizedCurrent} — 当前配置` });
  }
  return [...options.values()];
}
