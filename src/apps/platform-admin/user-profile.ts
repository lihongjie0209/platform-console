export interface UserProfileForm {
  display_name: string;
  email: string;
  phone: string;
  reason: string;
}

export function createUserProfileForm(
  user: Record<string, unknown> & {
    display_name?: unknown;
    email?: unknown;
    phone?: unknown;
  }
): UserProfileForm {
  return {
    display_name: String(user.display_name || ''),
    email: String(user.email || ''),
    phone: String(user.phone || ''),
    reason: ''
  };
}

export function normalizeUserProfileForm(form: UserProfileForm): UserProfileForm {
  return {
    display_name: form.display_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    reason: form.reason.trim()
  };
}
