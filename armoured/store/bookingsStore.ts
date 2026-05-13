import { create } from 'zustand';

import {
  apiGet,
  driverGet,
  ensureDriverSession,
  ensureUserSession,
  isNotAuthenticatedError,
} from '@/lib/api';

export type DriverBooking = {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  status: string;
  startTime: string;
  endTime: string;
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
  totalPrice?: number | null;
  driver?: { name: string } | null;
  vehicle?: {
    armourLevel?: string | null;
    vehicleType?: string | null;
    seatingCapacity?: number | null;
    manufacturer?: string | null;
    carModel?: string | null;
  } | null;
};

type BookingsState = {
  driverRequests: DriverBooking[];
  driverActive: DriverBooking[];
  driverCompleted: DriverBooking[];
  driverLoading: boolean;
  driverLoaded: boolean;
  driverError: string | null;

  userBookings: UserBooking[];
  userLoading: boolean;
  userLoaded: boolean;
  userError: string | null;

  refreshDriverBookings: () => Promise<void>;
  refreshUserBookings: () => Promise<void>;
  resetBookings: () => void;
};

export const useBookingsStore = create<BookingsState>((set) => ({
  driverRequests: [],
  driverActive: [],
  driverCompleted: [],
  driverLoading: false,
  driverLoaded: false,
  driverError: null,

  userBookings: [],
  userLoading: false,
  userLoaded: false,
  userError: null,

  refreshDriverBookings: async () => {
    set({ driverLoading: true, driverError: null });
    try {
      const s = await ensureDriverSession();
      const [req, act, done] = await Promise.all([
        driverGet<DriverBooking[]>(`/driver/requests`, s.driverId),
        driverGet<DriverBooking[]>(`/driver/bookings/active`, s.driverId),
        driverGet<DriverBooking[]>(`/driver/bookings/completed`, s.driverId),
      ]);
      set({
        driverRequests: Array.isArray(req) ? req : [],
        driverActive: Array.isArray(act) ? act : [],
        driverCompleted: Array.isArray(done) ? done : [],
        driverLoaded: true,
      });
    } catch (e) {
      if (isNotAuthenticatedError(e)) {
        set({ driverError: 'Not authenticated' });
        throw e;
      }
      set({ driverError: e instanceof Error ? e.message : 'Failed to load bookings' });
    } finally {
      set({ driverLoading: false });
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
      driverRequests: [],
      driverActive: [],
      driverCompleted: [],
      driverLoaded: false,
      driverError: null,
      userBookings: [],
      userLoaded: false,
      userError: null,
    }),
}));
