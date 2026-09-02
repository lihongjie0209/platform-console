import { consoleBuildInfo } from './build-info';

export const applicationLoadFailureEvent = 'platform:application-load-failure';

export interface ApplicationLoadContext {
  applicationCode: string;
  resourceKey: string;
  kind: 'page' | 'workspace';
}

export interface ApplicationLoadFailure extends ApplicationLoadContext {
  errorType: string;
  attempts: number;
  retrying: boolean;
  consoleVersion: string;
  gitCommit: string;
  buildTime: string;
}

export interface ApplicationLoadAttempt {
  context: ApplicationLoadContext;
  error: unknown;
  attempts: number;
  retrying: boolean;
}

export function createApplicationLoadFailure({
  context,
  error,
  attempts,
  retrying
}: ApplicationLoadAttempt): ApplicationLoadFailure {
  return {
    ...context,
    errorType: error instanceof Error ? error.name || 'Error' : typeof error,
    attempts,
    retrying,
    consoleVersion: consoleBuildInfo.version,
    gitCommit: consoleBuildInfo.gitCommit,
    buildTime: consoleBuildInfo.buildTime
  };
}

export function reportApplicationLoadFailure(failure: ApplicationLoadFailure) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(applicationLoadFailureEvent, { detail: failure }));
}
