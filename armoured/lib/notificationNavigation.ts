import {
  apiGet,
  dispatcherGet,
  getStoredDispatcherSession,
  getStoredUserSession,
} from '@/lib/api';
import type { NotificationNavData } from '@/lib/notifications';

type BookingRow = { id?: string };

async function userCanAccessBooking(bookingId: string): Promise<boolean> {
  const session = await getStoredUserSession();
  if (!session) return false;
  try {
    await apiGet(`/bookings/${bookingId}/options`, session.userId);
    return true;
  } catch {
    return false;
  }
}

async function dispatcherCanAccessBooking(bookingId: string): Promise<boolean> {
  const session = await getStoredDispatcherSession();
  if (!session) return false;
  try {
    const [active, completed, requests] = await Promise.all([
      dispatcherGet<BookingRow[]>(`/dispatcher/bookings/active`, session.dispatcherId),
      dispatcherGet<BookingRow[]>(`/dispatcher/bookings/completed`, session.dispatcherId),
      dispatcherGet<BookingRow[]>(`/dispatcher/requests`, session.dispatcherId),
    ]);
    const ids = new Set(
      [...active, ...completed, ...requests]
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    return ids.has(bookingId);
  } catch {
    return false;
  }
}

export async function canNavigateFromNotification(data: NotificationNavData): Promise<boolean> {
  if (!data.bookingId?.trim()) return false;
  const bookingId = data.bookingId.trim();
  if (data.role === 'DISPATCHER') {
    return dispatcherCanAccessBooking(bookingId);
  }
  return userCanAccessBooking(bookingId);
}
