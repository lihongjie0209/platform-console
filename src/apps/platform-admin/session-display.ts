export function sessionUserLabel(
  session: { user_id: string; username?: string; user_display_name?: string },
  fallback = ''
) {
  const username = String(session.username || '').trim();
  const displayName = String(session.user_display_name || '').trim();
  if (username) return `${displayName || username} (${username})`;
  return fallback || session.user_id;
}
