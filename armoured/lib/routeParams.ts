/** Normalize expo-router params (may be string or string[]). */
export function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').trim();
  return (value ?? '').trim();
}
