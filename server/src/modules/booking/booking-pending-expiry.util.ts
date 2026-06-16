import { BookingAuditAction, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** How long a dispatcher has to accept after the trip is submitted. */
export const DISPATCHER_ACCEPT_TIMEOUT_MS = 60 * 60 * 1000;

type PendingTiming = {
  status: string;
  pendingDispatcherAt?: Date | null;
  createdAt: Date;
};

type ExpireAuditContext = {
  audit: AuditService;
};

export function getPendingDispatcherExpiresAt(booking: PendingTiming): Date | null {
  if (booking.status !== 'PENDING_DISPATCHER') return null;
  const base = booking.pendingDispatcherAt ?? booking.createdAt;
  return new Date(base.getTime() + DISPATCHER_ACCEPT_TIMEOUT_MS);
}

export function isPendingDispatcherExpired(booking: PendingTiming, now = new Date()): boolean {
  const expiresAt = getPendingDispatcherExpiresAt(booking);
  return expiresAt != null && now.getTime() >= expiresAt.getTime();
}

export function withPendingExpiryFields<T extends PendingTiming>(booking: T) {
  const pendingExpiresAt = getPendingDispatcherExpiresAt(booking);
  return {
    ...booking,
    pendingExpiresAt: pendingExpiresAt?.toISOString() ?? null,
  };
}

async function logBookingExpired(audit: AuditService, bookingId: string) {
  await audit.logBookingAction({
    bookingId,
    actorRole: 'SYSTEM',
    action: BookingAuditAction.EXPIRED,
    fromStatus: BookingStatus.PENDING_DISPATCHER,
    toStatus: BookingStatus.EXPIRED,
    details: { reason: 'DISPATCHER_ACCEPT_TIMEOUT' },
  });
}

export async function expirePendingBooking(
  prisma: PrismaService | Prisma.TransactionClient,
  bookingId: string,
  vehicleId: string | null,
  ctx?: ExpireAuditContext,
) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'EXPIRED',
      vehicleId: null,
      dispatcherId: null,
    },
  });
  if (vehicleId) {
    await prisma.vehicle.updateMany({
      where: { id: vehicleId, status: 'BOOKED' },
      data: { status: 'AVAILABLE' },
    });
  }
  if (ctx?.audit) {
    await logBookingExpired(ctx.audit, bookingId);
  }
}

export async function expireStalePendingDispatcherBookings(
  prisma: PrismaService,
  ctx?: ExpireAuditContext,
) {
  const rows = await prisma.booking.findMany({
    where: { status: 'PENDING_DISPATCHER' },
    select: {
      id: true,
      vehicleId: true,
      pendingDispatcherAt: true,
      createdAt: true,
      status: true,
    },
  });
  const now = new Date();
  for (const row of rows) {
    if (!isPendingDispatcherExpired(row, now)) continue;
    await prisma.$transaction(async (tx) => {
      await expirePendingBooking(tx, row.id, row.vehicleId, ctx);
    });
  }
}

export async function expirePendingBookingIfNeeded(
  prisma: PrismaService,
  bookingId: string,
  ctx?: ExpireAuditContext,
): Promise<boolean> {
  const row = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      vehicleId: true,
      pendingDispatcherAt: true,
      createdAt: true,
    },
  });
  if (!row || row.status !== 'PENDING_DISPATCHER') return false;
  if (!isPendingDispatcherExpired(row)) return false;
  await prisma.$transaction(async (tx) => {
    await expirePendingBooking(tx, row.id, row.vehicleId, ctx);
  });
  return true;
}
