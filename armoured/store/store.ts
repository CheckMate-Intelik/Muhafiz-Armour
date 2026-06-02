import { create } from 'zustand';

import {
  AppRole,
  apiGet,
  apiPatch,
  apiUploadProfileImage,
  dispatcherGet,
  dispatcherPatch,
  dispatcherUploadProfileImage,
  clearAllStoredSessions,
  ensureDispatcherSession,
  ensureUserSession,
  getActiveRole,
  getStoredDispatcherSession,
  getStoredUserSession,
  setActiveRole,
  setStoredDispatcherSession,
  setStoredUserSession,
} from '@/lib/api';
import { syncPushTokensWithServer, unregisterPushTokensFromServer } from '@/lib/notifications';
import { useBookingsStore } from '@/store/bookingsStore';
import { useSessionNotificationsStore } from '@/store/sessionNotificationsStore';

export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profileImageUrl: string | null;
  isBlocked: boolean;
  createdAt: string;
};

export type DispatcherProfile = {
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
export const DEFAULT_DISPATCHER_AVATAR_SM = 'https://i.pravatar.cc/96?img=32';
export const DEFAULT_DISPATCHER_AVATAR_LG = 'https://i.pravatar.cc/240?img=32';

export function userAvatarUrl(profile: UserProfile | null | undefined, size: 'sm' | 'lg' = 'sm') {
  const u = profile?.profileImageUrl?.trim();
  if (u) return u;
  return size === 'lg' ? DEFAULT_USER_AVATAR_LG : DEFAULT_USER_AVATAR_SM;
}

export function dispatcherAvatarUrl(profile: DispatcherProfile | null | undefined, size: 'sm' | 'lg' = 'sm') {
  const u = profile?.profileImageUrl?.trim();
  if (u) return u;
  return size === 'lg' ? DEFAULT_DISPATCHER_AVATAR_LG : DEFAULT_DISPATCHER_AVATAR_SM;
}

export type AuthState = {
  activeRole: AppRole;
  session: null | { userId: string; email?: string; phone?: string; name?: string };
  dispatcherSession: null | { dispatcherId: string; email?: string; phone?: string; name?: string };
  profile: UserProfile | null;
  dispatcherProfile: DispatcherProfile | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  uploadUserProfilePhoto: (localUri: string) => Promise<void>;
  uploadDispatcherProfilePhoto: (localUri: string) => Promise<void>;
  switchRole: (role: AppRole) => Promise<void>;
  /** Call after login/signup once credentials are stored; hydrates before navigation. */
  completeAuth: (role: AppRole) => Promise<void>;
  logout: () => Promise<void>;
};

export const useStore = create<AuthState>((set, get) => ({
  activeRole: 'USER',
  session: null,
  dispatcherSession: null,
  profile: null,
  dispatcherProfile: null,
  loading: false,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const [role, storedUser, storedDispatcher] = await Promise.all([
        getActiveRole(),
        getStoredUserSession(),
        getStoredDispatcherSession(),
      ]);
      set({
        activeRole: role,
        session: storedUser
          ? { userId: storedUser.userId, email: storedUser.email, phone: storedUser.phone, name: storedUser.name }
          : null,
        dispatcherSession: storedDispatcher
          ? {
              dispatcherId: storedDispatcher.dispatcherId,
              email: storedDispatcher.email,
              phone: storedDispatcher.phone,
              name: storedDispatcher.name,
            }
          : null,
      });

      if (role === 'USER' && !storedUser) {
        const s = await ensureUserSession();
        set({ session: { userId: s.userId, email: s.email, phone: s.phone, name: s.name } });
      }
      if (role === 'DISPATCHER' && !storedDispatcher) {
        const s = await ensureDispatcherSession();
        set({
          dispatcherSession: {
            dispatcherId: s.dispatcherId,
            email: s.email,
            phone: s.phone,
            name: s.name,
          },
        });
      }
      await get().refreshProfile();
      void syncPushTokensWithServer();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load session' });
    } finally {
      set({ loading: false });
    }
  },

  refreshProfile: async () => {
    set({ error: null });
    const state = get();
    if (state.activeRole === 'DISPATCHER') {
      const existingDispatcher = state.dispatcherSession;
      if (!existingDispatcher) throw new Error('Not authenticated');
      const dispatcherProfile = await dispatcherGet<DispatcherProfile>(
        `/dispatcher/me`,
        existingDispatcher.dispatcherId,
      );
      set({ dispatcherProfile });
      await setStoredDispatcherSession({
        dispatcherId: existingDispatcher.dispatcherId,
        email: dispatcherProfile.email ?? undefined,
        phone: dispatcherProfile.phone,
        name: dispatcherProfile.name,
      });
      set({
        dispatcherSession: {
          dispatcherId: existingDispatcher.dispatcherId,
          email: dispatcherProfile.email ?? undefined,
          phone: dispatcherProfile.phone,
          name: dispatcherProfile.name,
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

  uploadDispatcherProfilePhoto: async (localUri: string) => {
    const session = await ensureDispatcherSession();
    const { url } = await dispatcherUploadProfileImage(session.dispatcherId, localUri);
    await dispatcherPatch('/dispatcher/me', session.dispatcherId, { profileImageUrl: url });
    await get().refreshProfile();
  },

  switchRole: async (role) => {
    await setActiveRole(role);
    useSessionNotificationsStore.getState().clear();
    useBookingsStore.getState().resetBookings();
    set({ activeRole: role, error: null });
    await get().hydrate();
    void syncPushTokensWithServer();
  },

  completeAuth: async (role) => {
    await setActiveRole(role);
    useSessionNotificationsStore.getState().clear();
    useBookingsStore.getState().resetBookings();
    set({
      activeRole: role,
      session: null,
      dispatcherSession: null,
      profile: null,
      dispatcherProfile: null,
      error: null,
      loading: true,
    });
    await get().hydrate();
    void syncPushTokensWithServer();
  },

  logout: async () => {
    await unregisterPushTokensFromServer();
    useSessionNotificationsStore.getState().clear();
    useBookingsStore.getState().resetBookings();
    await clearAllStoredSessions();
    set({
      activeRole: 'USER',
      session: null,
      dispatcherSession: null,
      profile: null,
      dispatcherProfile: null,
      error: null,
      loading: false,
    });
  },
}));
