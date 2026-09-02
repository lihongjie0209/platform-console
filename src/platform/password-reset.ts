export function passwordResetTokenFromLocation(hash: string, queryToken: unknown): string {
  const fragmentToken = new URLSearchParams(hash.replace(/^#/, '')).get('token') || '';
  return fragmentToken || (typeof queryToken === 'string' ? queryToken : '');
}

export function buildPasswordResetURL(origin: string, token: string): string {
  const url = new URL('/login/reset-pwd', origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
