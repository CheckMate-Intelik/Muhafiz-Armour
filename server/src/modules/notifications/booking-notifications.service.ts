import { Injectable, Logger } from '@nestjs/common';
import { Booking, BookingStatus } from '@prisma/client';
import { PushDataPayload, PushNotificationService } from './push-notification.service';

export type BookingNotificationKind =
  | 'BOOKING_PENDING_DISPATCHER'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_STARTED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED_BY_USER'
  | 'BOOKING_CANCELLED_BY_DISPATCHER'
  | 'EXTENSION_REQUESTED'
  | 'EXTENSION_APPROVED'
  | 'EXTENSION_DECLINED';

type BookingTarget = Pick<Booking, 'id' | 'status' | 'userId' | 'dispatcherId' | 'pickupLocation' | 'dropLocation'>;

const COPY: Record<BookingNotificationKind, { title: string; body: string }> = {
  BOOKING_PENDING_DISPATCHER: {
    title: 'New booking request',
    body: 'A customer submitted a trip for your review.',
  },
  BOOKING_CONFIRMED: {
    title: 'Booking confirmed',
    body: 'Your armoured trip has been accepted.',
  },
  BOOKING_REJECTED: {
    title: 'Booking declined',
    body: 'Your trip request was not accepted.',
  },
  BOOKING_STARTED: {
    title: 'Trip started',
    body: 'Your armoured vehicle is on the way.',
  },
  BOOKING_COMPLETED: {
    title: 'Trip completed',
    body: 'Your trip has been marked complete.',
  },
  BOOKING_CANCELLED_BY_USER: {
    title: 'Booking cancelled',
    body: 'The customer cancelled their trip.',
  },
  BOOKING_CANCELLED_BY_DISPATCHER: {
    title: 'Booking cancelled',
    body: 'The dispatcher cancelled your trip.',
  },
  EXTENSION_REQUESTED: {
    title: 'Extension requested',
    body: 'The customer requested to extend the trip.',
  },
  EXTENSION_APPROVED: {
    title: 'Extension approved',
    body: 'Your trip extension was approved.',
  },
  EXTENSION_DECLINED: {
    title: 'Extension declined',
    body: 'Your trip extension was declined.',
  },
};

@Injectable()
export class BookingNotificationsService {
  private readonly logger = new Logger(BookingNotificationsService.name);

  constructor(private readonly push: PushNotificationService) {}

  notify(kind: BookingNotificationKind, booking: BookingTarget) {
    const copy = COPY[kind];
    const task = (async () => {
      if (this.targetsUser(kind) && booking.userId) {
        await this.push.sendToUser(booking.userId, copy.title, this.bodyWithRoute(copy.body, booking), {
          bookingId: booking.id,
          status: booking.status,
          kind,
          role: 'USER',
        });
      }
      if (this.targetsDispatcher(kind) && booking.dispatcherId) {
        await this.push.sendToDispatcher(
          booking.dispatcherId,
          copy.title,
          this.bodyWithRoute(copy.body, booking),
          {
            bookingId: booking.id,
            status: booking.status,
            kind,
            role: 'DISPATCHER',
          },
        );
      }
    })();

    task.catch((err) => {
      this.logger.warn(`Push notify failed (${kind}, ${booking.id}): ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private targetsUser(kind: BookingNotificationKind) {
    return [
      'BOOKING_CONFIRMED',
      'BOOKING_REJECTED',
      'BOOKING_STARTED',
      'BOOKING_COMPLETED',
      'BOOKING_CANCELLED_BY_DISPATCHER',
      'EXTENSION_APPROVED',
      'EXTENSION_DECLINED',
    ].includes(kind);
  }

  private targetsDispatcher(kind: BookingNotificationKind) {
    return [
      'BOOKING_PENDING_DISPATCHER',
      'BOOKING_CANCELLED_BY_USER',
      'EXTENSION_REQUESTED',
    ].includes(kind);
  }

  private bodyWithRoute(base: string, booking: BookingTarget) {
    const pickup = booking.pickupLocation?.trim();
    const drop = booking.dropLocation?.trim();
    if (!pickup || !drop) return base;
    return `${base} ${pickup} → ${drop}.`;
  }

  notifyStatusChange(
    booking: BookingTarget,
    previousStatus: BookingStatus | null,
    actor: 'USER' | 'DISPATCHER',
  ) {
    const { status } = booking;

    if (status === 'PENDING_DISPATCHER' && previousStatus !== 'PENDING_DISPATCHER') {
      this.notify('BOOKING_PENDING_DISPATCHER', booking);
      return;
    }
    if (status === 'CONFIRMED') {
      this.notify('BOOKING_CONFIRMED', booking);
      return;
    }
    if (status === 'IN_PROGRESS') {
      this.notify('BOOKING_STARTED', booking);
      return;
    }
    if (status === 'COMPLETED') {
      this.notify('BOOKING_COMPLETED', booking);
      return;
    }
    if (status === 'REJECTED') {
      if (actor === 'USER') {
        this.notify('BOOKING_CANCELLED_BY_USER', booking);
      } else if (previousStatus === 'PENDING_DISPATCHER') {
        this.notify('BOOKING_REJECTED', booking);
      } else {
        this.notify('BOOKING_CANCELLED_BY_DISPATCHER', booking);
      }
    }
  }
}
