export async function revokeCurrentSession(
  sessionID: string,
  revoke: (sessionID: string) => Promise<boolean>,
  clearLocalState: () => Promise<void>
): Promise<boolean> {
  let revoked = true;
  try {
    if (sessionID) revoked = await revoke(sessionID);
  } catch {
    revoked = false;
  } finally {
    await clearLocalState();
  }
  return revoked;
}
