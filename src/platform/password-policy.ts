const encoder = new TextEncoder();

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): string | undefined {
  if (!currentPassword) return '请输入当前密码';
  const byteLength = encoder.encode(newPassword).byteLength;
  if (byteLength < 12 || byteLength > 1024) return '新密码长度必须为 12 到 1024 字节';
  if (newPassword === currentPassword) return '新密码不能与当前密码相同';
  if (confirmPassword !== newPassword) return '两次输入的新密码不一致';
  return undefined;
}
