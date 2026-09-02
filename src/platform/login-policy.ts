export const supportedLoginModules = ['pwd-login', 'reset-pwd'] as const;

export type SupportedLoginModule = (typeof supportedLoginModules)[number];

export function normalizeLoginModule(value: unknown): SupportedLoginModule {
  return value === 'reset-pwd' ? 'reset-pwd' : 'pwd-login';
}
