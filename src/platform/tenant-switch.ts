export interface TenantSwitchActions {
  selectTenant: (tenantId: string) => Promise<void>;
  refreshRoutes: () => void;
  openApplicationLauncher: () => Promise<unknown>;
}

/** Completes the trusted server scope exchange before replacing routes and leaving the old tenant page. */
export async function switchTenantContext(tenantId: string, actions: TenantSwitchActions) {
  await actions.selectTenant(tenantId);
  actions.refreshRoutes();
  await actions.openApplicationLauncher();
}
