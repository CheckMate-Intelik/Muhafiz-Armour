import { create } from 'zustand';

import { apiGet, ensureUserSession, getStoredUserSession, setStoredUserSession } from '@/lib/api';

export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isBlocked: boolean;
  createdAt: string;
};

export type AuthState = {
  session: null | { userId: string; email?: string; phone?: string; name?: string };
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const stored = await getStoredUserSession();
      if (stored) {
        set({ session: { userId: stored.userId, email: stored.email, phone: stored.phone, name: stored.name } });
      } else {
        const s = await ensureUserSession();
        set({ session: { userId: s.userId, email: s.email, phone: s.phone, name: s.name } });
      }
      await get().refreshProfile();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load session' });
    } finally {
      set({ loading: false });
    }
  },

  refreshProfile: async () => {
    set({ error: null });
    const existing = get().session;
    if (!existing) throw new Error('Not authenticated');

    const profile = await apiGet<UserProfile>(`/users/me`, existing.userId);
    set({ profile });
  },

  logout: async () => {
    await setStoredUserSession(null);
    set({ session: null, profile: null, error: null });
  },
}));
