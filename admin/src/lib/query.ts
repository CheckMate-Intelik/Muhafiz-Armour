export function toQueryString(params: Record<string, string | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== '') qs.set(key, String(value).trim());
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
