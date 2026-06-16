const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254) return false;
  return EMAIL_PATTERN.test(email);
}

export function emailValidationMessage(value: string) {
  if (!value.trim()) return 'Email is required';
  if (!isValidEmail(value)) return 'Enter a valid email address';
  return null;
}
