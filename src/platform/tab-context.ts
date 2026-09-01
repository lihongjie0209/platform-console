export type ContextTab = {
  id: string;
  routeKey: PropertyKey;
};

export type ReconciledTabs<T extends ContextTab> = {
  tabs: T[];
  activeTabId: string;
};

export type TabContextState = {
  activeTabId: string;
  homeTabId: string;
};

/**
 * Removes tabs whose routes disappeared after a tenant/application navigation refresh.
 * The input is never mutated so the caller can update reactive state atomically.
 */
export function reconcileContextTabs<T extends ContextTab>(
  tabs: readonly T[],
  availableRouteNames: ReadonlySet<PropertyKey>,
  context: TabContextState
): ReconciledTabs<T> {
  const { activeTabId, homeTabId } = context;
  const retainedTabs = tabs.filter(tab => availableRouteNames.has(tab.routeKey));
  const activeStillAvailable = activeTabId === homeTabId || retainedTabs.some(tab => tab.id === activeTabId);

  return {
    tabs: retainedTabs,
    activeTabId: activeStillAvailable ? activeTabId : homeTabId
  };
}
