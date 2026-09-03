export function hasPersistedStateChanged(visibleStatus: string, currentStatus: string) {
  return visibleStatus !== currentStatus;
}

export function hasPersistedVersionChanged(visibleVersion: number, currentVersion: number) {
  return visibleVersion !== currentVersion;
}
