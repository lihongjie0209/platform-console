export function isTaskActionable(status: string) {
  return status === 'pending' || status === 'claimed';
}
