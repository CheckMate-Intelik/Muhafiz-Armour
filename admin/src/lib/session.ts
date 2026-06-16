export type AdminSession = {
  role: 'ADMIN';
};

const STORAGE_KEY = 'armored_admin_session_v1';

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (parsed?.role !== 'ADMIN') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== 'undefined') {
    void fetch('/api/auth/logout', { method: 'POST' });
  }
}
