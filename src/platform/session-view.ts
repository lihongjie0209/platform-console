interface SessionIdentity {
  session_id: string;
  status: string;
}

export function isCurrentSession(session: SessionIdentity, currentSessionID: string) {
  return currentSessionID !== '' && session.session_id === currentSessionID;
}

export function canRevokeSession(session: SessionIdentity, currentSessionID: string) {
  return session.status === 'active' && !isCurrentSession(session, currentSessionID);
}
