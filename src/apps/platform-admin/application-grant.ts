import type { ApplicationGrant } from './api';

type GrantVersion = Pick<ApplicationGrant, 'status' | 'version'>;

export function applicationGrantExpectedVersion(grant?: Pick<ApplicationGrant, 'version'>) {
  return Number(grant?.version || 0);
}

export function applicationGrantChanged(snapshot: GrantVersion, current: GrantVersion) {
  return snapshot.status !== current.status || Number(snapshot.version) !== Number(current.version);
}
