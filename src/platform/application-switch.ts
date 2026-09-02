import type { ApplicationEntryDecision } from './navigation';
import { applicationEntryStatusMessage } from './navigation';

export interface ApplicationSwitchActions {
  selectApplication: (applicationId: string) => void;
  refreshRoutes: () => void;
  entryPathForApplication: (applicationId: string) => string;
  navigate: (path: string) => Promise<unknown>;
}

export async function switchApplicationContext(
  applicationId: string,
  decision: ApplicationEntryDecision,
  actions: ApplicationSwitchActions
) {
  const unavailableMessage = applicationEntryStatusMessage(decision.status);
  if (unavailableMessage) throw new Error(unavailableMessage);

  actions.selectApplication(applicationId);
  actions.refreshRoutes();
  await actions.navigate(actions.entryPathForApplication(applicationId));
}
