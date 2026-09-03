export function hasPersistedStateChanged(visibleStatus: string, currentStatus: string) {
  return visibleStatus !== currentStatus;
}
