export function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validateMockPassword(password: string): string | null {
  if (!password.trim()) return 'Enter the mock password.';
  return null;
}
