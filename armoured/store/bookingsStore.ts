import { create } from 'zustand';

import {
  apiGet,
  dispatcherGet,
  ensureDispatcherSession,
  ensureUserSession,
  isNotAuthenticatedError,
} from '@/lib/api';

export type DispatcherBooking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  startTime: string;
  endTime: string;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  totalPrice: number | null;
  actualEndTime?: string | null;
  user?: { name: string } | null;
  vehicle?: {
    id?: string;
    armourLevel?: string | null;
    vehicleType?: string | null;
    seatingCapacity?: number | null;
    manufacturer?: string | null;
    carModel?: string | null;
    imageUrls?: string[];
    baseRatePerHour?: number;
    location?: string;
  } | null;
};

export type UserBooking = {
  id: string;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  status?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  pendingExpiresAt?: string | null;
  createdAt?: string | null;
  totalPrice?: number | null;
  dispatcher?: { name: string } | null;
  vehicle?: {
    armourLevel?: string | null;
    vehicleType?: string | null;
    seatingCapacity?: number | null;
    manufacturer?: string | null;
    carModel?: string | null;
    imageUrls?: string[];
  } | null;
};

type BookingsState = {
  dispatcherRequests: DispatcherBooking[];
  dispatcherActive: DispatcherBooking[];
  dispatcherCompleted: DispatcherBooking[];
  dispatcherLoading: boolean;
  dispatcherLoaded: boolean;
  dispatcherError: string | null;

  userBookings: UserBooking[];
  userLoading: boolean;
  userLoaded: boolean;
  userError: string | null;

  refreshDispatcherBookings: () => Promise<void>;
  refreshUserBookings: () => Promise<void>;
  resetBookings: () => void;
};

export const useBookingsStore = create<BookingsState>((set) => ({
  dispatcherRequests: [],
  dispatcherActive: [],
  dispatcherCompleted: [],
  dispatcherLoading: false,
  dispatcherLoaded: false,
  dispatcherError: null,

  userBookings: [],
  userLoading: false,
  userLoaded: false,
  userError: null,

  refreshDispatcherBookings: async () => {
    set({ dispatcherLoading: true, dispatcherError: null });
    try {
      const s = await ensureDispatcherSession();
      const [req, act, done] = await Promise.all([
        dispatcherGet<DispatcherBooking[]>(`/dispatcher/requests`, s.dispatcherId),
        dispatcherGet<DispatcherBooking[]>(`/dispatcher/bookings/active`, s.dispatcherId),
        dispatcherGet<DispatcherBooking[]>(`/dispatcher/bookings/completed`, s.dispatcherId),
      ]);
      set({
        dispatcherRequests: Array.isArray(req) ? req : [],
        dispatcherActive: Array.isArray(act) ? act : [],
        dispatcherCompleted: Array.isArray(done) ? done : [],
        dispatcherLoaded: true,
      });
    } catch (e) {
      if (isNotAuthenticatedError(e)) {
        set({ dispatcherError: 'Not authenticated' });
        throw e;
      }
      set({ dispatcherError: e instanceof Error ? e.message : 'Failed to load bookings' });
    } finally {
      set({ dispatcherLoading: false });
    }
  },

  refreshUserBookings: async () => {
    set({ userLoading: true, userError: null });
    try {
      const s = await ensureUserSession();
      const data = await apiGet<UserBooking[]>(`/bookings`, s.userId);
      set({
        userBookings: Array.isArray(data) ? data : [],
        userLoaded: true,
      });
    } catch (e) {
      if (isNotAuthenticatedError(e)) {
        set({ userError: 'Not authenticated' });
        throw e;
      }
      set({ userError: e instanceof Error ? e.message : 'Failed to load bookings' });
    } finally {
      set({ userLoading: false });
    }
  },

  resetBookings: () =>
    set({
      dispatcherRequests: [],
      dispatcherActive: [],
      dispatcherCompleted: [],
      dispatcherLoaded: false,
      dispatcherError: null,
      userBookings: [],
      userLoaded: false,
      userError: null,
    }),
}));
