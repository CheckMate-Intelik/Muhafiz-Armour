import { create } from 'zustand';

import {
  AppRole,
  apiGet,
  driverGet,
  ensureDriverSession,
  ensureUserSession,
  getActiveRole,
  getStoredDriverSession,
  getStoredUserSession,
  setActiveRole,
  setStoredDriverSession,
  setStoredUserSession,
} from '@/lib/api';

export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isBlocked: boolean;
  createdAt: string;
};

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
  activeRole: AppRole;
  session: null | { userId: string; email?: string; phone?: string; name?: string };
  driverSession: null | { driverId: string; email?: string; phone?: string; name?: string };
  profile: UserProfile | null;
  driverProfile: DriverProfile | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchRole: (role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
};

export const useStore = create<AuthState>((set, get) => ({
  activeRole: 'USER',
  session: null,
  driverSession: null,
  profile: null,
  driverProfile: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const [role, storedUser, storedDriver] = await Promise.all([
        getActiveRole(),
        getStoredUserSession(),
        getStoredDriverSession(),
      ]);
      set({
        activeRole: role,
        session: storedUser
          ? { userId: storedUser.userId, email: storedUser.email, phone: storedUser.phone, name: storedUser.name }
          : null,
        driverSession: storedDriver
          ? { driverId: storedDriver.driverId, email: storedDriver.email, phone: storedDriver.phone, name: storedDriver.name }
          : null,
      });

      if (role === 'USER' && !storedUser) {
        const s = await ensureUserSession();
        set({ session: { userId: s.userId, email: s.email, phone: s.phone, name: s.name } });
      }
      if (role === 'DRIVER' && !storedDriver) {
        const s = await ensureDriverSession();
        set({ driverSession: { driverId: s.driverId, email: s.email, phone: s.phone, name: s.name } });
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
    const state = get();
    if (state.activeRole === 'DRIVER') {
      const existingDriver = state.driverSession;
      if (!existingDriver) throw new Error('Not authenticated');
      const driverProfile = await driverGet<DriverProfile>(`/driver/me`, existingDriver.driverId);
      set({ driverProfile });
      return;
    }

    const existing = state.session;
    if (!existing) throw new Error('Not authenticated');
    const profile = await apiGet<UserProfile>(`/users/me`, existing.userId);
    set({ profile });
  },

  switchRole: async (role) => {
    await setActiveRole(role);
    set({ activeRole: role, error: null });
    await get().hydrate();
  },

  logout: async () => {
    const role = get().activeRole;
    if (role === 'DRIVER') {
      await setStoredDriverSession(null);
      set({ driverSession: null, driverProfile: null, error: null });
      return;
    }
    await setStoredUserSession(null);
    set({ session: null, profile: null, error: null });
  },
}));
