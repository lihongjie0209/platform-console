export function hasPersistedStateChanged(visibleStatus: string, currentStatus: string) {
  return visibleStatus !== currentStatus;
}

export function isTaskActionable(status: string) {
  return status === 'pending' || status === 'claimed';
}
