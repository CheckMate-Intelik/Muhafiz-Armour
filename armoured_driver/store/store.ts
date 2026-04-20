import { create } from 'zustand';

import { driverGet, ensureDriverSession, getStoredDriverSession, setStoredDriverSession } from '@/lib/api';

export type DriverProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isApproved: boolean;
  isBlocked: boolean;
  createdAt: string;
};

export type AuthState = {
  session: null | { driverId: string; email?: string; phone?: string; name?: string };
  profile: DriverProfile | null;
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
      const stored = await getStoredDriverSession();
      if (stored) {
        set({ session: { driverId: stored.driverId, email: stored.email, phone: stored.phone, name: stored.name } });
      } else {
        const s = await ensureDriverSession();
        set({ session: { driverId: s.driverId, email: s.email, phone: s.phone, name: s.name } });
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

    const profile = await driverGet<DriverProfile>(`/driver/me`, existing.driverId);
    set({ profile });
  },

  logout: async () => {
    await setStoredDriverSession(null);
    set({ session: null, profile: null, error: null });
  },
}));
