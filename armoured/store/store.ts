import { create } from 'zustand';

import {
  AppRole,
  apiGet,
  apiPatch,
  apiUploadProfileImage,
  driverGet,
  driverPatch,
  driverUploadProfileImage,
  ensureDriverSession,
  ensureUserSession,
  getActiveRole,
  getStoredDriverSession,
  getStoredUserSession,
  setActiveRole,
  setStoredDriverSession,
  setStoredUserSession,
} from '@/lib/api';
import { useBookingsStore } from '@/store/bookingsStore';

export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profileImageUrl: string | null;
  isBlocked: boolean;
  createdAt: string;
};

export type DriverProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profileImageUrl: string | null;
  isApproved: boolean;
  isBlocked: boolean;
  createdAt: string;
};

export const DEFAULT_USER_AVATAR_SM = 'https://i.pravatar.cc/96?img=12';
export const DEFAULT_USER_AVATAR_LG = 'https://i.pravatar.cc/240?img=12';
export const DEFAULT_DRIVER_AVATAR_SM = 'https://i.pravatar.cc/96?img=32';
export const DEFAULT_DRIVER_AVATAR_LG = 'https://i.pravatar.cc/240?img=32';

export function userAvatarUrl(profile: UserProfile | null | undefined, size: 'sm' | 'lg' = 'sm') {
  const u = profile?.profileImageUrl?.trim();
  if (u) return u;
  return size === 'lg' ? DEFAULT_USER_AVATAR_LG : DEFAULT_USER_AVATAR_SM;
}

export function driverAvatarUrl(profile: DriverProfile | null | undefined, size: 'sm' | 'lg' = 'sm') {
  const u = profile?.profileImageUrl?.trim();
  if (u) return u;
  return size === 'lg' ? DEFAULT_DRIVER_AVATAR_LG : DEFAULT_DRIVER_AVATAR_SM;
}

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
  uploadUserProfilePhoto: (localUri: string) => Promise<void>;
  uploadDriverProfilePhoto: (localUri: string) => Promise<void>;
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
      await setStoredDriverSession({
        driverId: existingDriver.driverId,
        email: driverProfile.email ?? undefined,
        phone: driverProfile.phone,
        name: driverProfile.name,
      });
      set({
        driverSession: {
          driverId: existingDriver.driverId,
          email: driverProfile.email ?? undefined,
          phone: driverProfile.phone,
          name: driverProfile.name,
        },
      });
      return;
    }

    const existing = state.session;
    if (!existing) throw new Error('Not authenticated');
    const profile = await apiGet<UserProfile>(`/users/me`, existing.userId);
    set({ profile });
    await setStoredUserSession({
      userId: existing.userId,
      email: profile.email ?? undefined,
      phone: profile.phone,
      name: profile.name,
    });
    set({
      session: {
        userId: existing.userId,
        email: profile.email ?? undefined,
        phone: profile.phone,
        name: profile.name,
      },
    });
  },

  uploadUserProfilePhoto: async (localUri: string) => {
    const session = await ensureUserSession();
    const { url } = await apiUploadProfileImage(session.userId, localUri);
    await apiPatch('/users/me', session.userId, { profileImageUrl: url });
    await get().refreshProfile();
  },

  uploadDriverProfilePhoto: async (localUri: string) => {
    const session = await ensureDriverSession();
    const { url } = await driverUploadProfileImage(session.driverId, localUri);
    await driverPatch('/driver/me', session.driverId, { profileImageUrl: url });
    await get().refreshProfile();
  },

  switchRole: async (role) => {
    await setActiveRole(role);
    useBookingsStore.getState().resetBookings();
    set({ activeRole: role, error: null });
    await get().hydrate();
  },

  logout: async () => {
    const role = get().activeRole;
    useBookingsStore.getState().resetBookings();
    if (role === 'DRIVER') {
      await setStoredDriverSession(null);
      set({ driverSession: null, driverProfile: null, error: null });
      return;
    }
    await setStoredUserSession(null);
    set({ session: null, profile: null, error: null });
  },
}));
