import { router } from 'expo-router';

import { BookingSummaryCard } from '@/components/BookingSummaryCard';

export type BookingHistoryCardBooking = {
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
  user?: { name: string } | null;
  vehicle?: {
    armourLevel?: string | null;
    vehicleType?: string | null;
    manufacturer?: string | null;
    carModel?: string | null;
  } | null;
};

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase();
}

function userMissionBanner(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === 'COMPLETED') return 'COMPLETED';
  if (s === 'REJECTED' || s === 'EXPIRED') return 'CANCELED';
  if (s === 'IN_PROGRESS') return 'ACTIVE';
  return 'UPCOMING';
}

function dispatcherMissionBanner(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === 'IN_PROGRESS') return 'ACTIVE';
  if (s === 'CONFIRMED') return 'CONFIRMED';
  if (s === 'COMPLETED') return 'COMPLETED';
  if (s === 'REJECTED' || s === 'EXPIRED') return 'CANCELED';
  if (s === 'PENDING_DISPATCHER') return 'PENDING';
  if (s === 'REQUESTED') return 'REQUEST';
  return 'BOOKING';
}

function missionHeaderLine(booking: BookingHistoryCardBooking, variant: 'user' | 'dispatcher') {
  const vehicleBit = booking.vehicle?.vehicleType ?? booking.vehicle?.armourLevel ?? '—';
  if (variant === 'user') {
    const dispatcherAndArmour =
      `${booking.dispatcher?.name ?? '—'} • ${booking.vehicle?.armourLevel ?? '—'}`.trim();
    return `${userMissionBanner(booking.status)} - ${dispatcherAndArmour}`;
  }
  const customerName = booking.user?.name ?? '—';
  return `${dispatcherMissionBanner(booking.status)} - ${customerName}`;
}

function openBookingDetails(booking: BookingHistoryCardBooking, variant: 'user' | 'dispatcher') {
  const vehicleName =
    `${booking.vehicle?.manufacturer ?? ''} ${booking.vehicle?.carModel ?? ''}`.trim();
  const payout = booking.totalPrice ?? 0;
  const customerName = booking.user?.name ?? '';

  router.push({
    pathname: '/booking-details' as any,
    params: {
      id: booking.id,
      pickupLocation: booking.pickupLocation ?? '',
      dropLocation: booking.dropLocation ?? '',
      status: booking.status ?? '',
      startTime: booking.startTime ?? '',
      endTime: booking.endTime ?? '',
      totalPrice: booking.totalPrice == null ? '' : String(booking.totalPrice),
      dispatcherName: variant === 'user' ? (booking.dispatcher?.name ?? '') : '',
      customerName: variant === 'dispatcher' ? customerName : '',
      vehicleArmour: booking.vehicle?.armourLevel ?? '',
      vehicleType: booking.vehicle?.vehicleType ?? '',
      vehicleName,
    },
  });
}

type Props = {
  booking: BookingHistoryCardBooking;
  variant: 'user' | 'dispatcher';
};

export function BookingHistoryCard({ booking, variant }: Props) {
  const payout = booking.totalPrice ?? 0;

  return (
    <BookingSummaryCard
      variant="mission"
      missionHeaderLine={missionHeaderLine(booking, variant)}
      pickupLocation={booking.pickupLocation ?? ''}
      dropLocation={booking.dropLocation ?? ''}
      payout={payout}
      status={booking.status}
      pendingExpiresAt={booking.pendingExpiresAt}
      createdAt={booking.createdAt}
      onPress={() => openBookingDetails(booking, variant)}
    />
  );
}
