import { apiPost } from '@/lib/api';

export type ConfirmBookingPayload = {
  vehicleId: string;
  pickupLocation: string;
  dropLocation: string;
  startTime: string;
  endTime: string;
  pickupCity?: string;
  dropCity?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
};

export type ConfirmedBooking = {
  id: string;
  totalPrice?: number | null;
  pickupLocation?: string;
  dropLocation?: string;
  status?: string;
};

export async function confirmExistingBookingAfterPayment(
  userId: string,
  bookingId: string,
  vehicleId: string,
) {
  return apiPost<ConfirmedBooking>(`/bookings/${bookingId}/select`, userId, { vehicleId });
}

export async function createBookingAfterPayment(userId: string, payload: ConfirmBookingPayload) {
  const req = await apiPost<{ booking?: { id: string } }>(`/bookings/request`, userId, {
    pickupLocation: payload.pickupLocation,
    dropLocation: payload.dropLocation,
    pickupCity: payload.pickupCity,
    dropCity: payload.dropCity,
    pickupLat: payload.pickupLat,
    pickupLng: payload.pickupLng,
    dropLat: payload.dropLat,
    dropLng: payload.dropLng,
    startTime: payload.startTime,
    endTime: payload.endTime,
  });
  const bookingId = req.booking?.id;
  if (!bookingId) throw new Error('Booking request failed');

  const booking = await apiPost<ConfirmedBooking>(`/bookings/${bookingId}/select`, userId, {
    vehicleId: payload.vehicleId,
  });
  return booking;
}
