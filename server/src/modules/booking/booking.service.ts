import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingAuditAction, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  bufferMinutesForTrip,
  distanceKmFromCoords,
  distanceMinHours,
  effectiveMinDurationHours,
} from '../../common/trip-planning';
import { MatchingService } from '../matching/matching.service';
import { AuditService } from '../audit/audit.service';
import { BookingNotificationsService } from '../notifications/booking-notifications.service';
import { RequestBookingDto } from './dto/request-booking.dto';
import { UpdateBookingScheduleDto } from './dto/update-booking-schedule.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { extensionRequestsInclude, serializeBookingWithExtension } from './booking-extension.util';
import {
  expirePendingBookingIfNeeded,
  expireStalePendingDispatcherBookings,
  withPendingExpiryFields,
} from './booking-pending-expiry.util';

const MAX_BOOKING_HOURS = 5 * 24;

const USER_ACTIVE_BOOKING_STATUSES: Array<
  'PENDING_DISPATCHER' | 'CONFIRMED' | 'IN_PROGRESS'
> = ['PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'];

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly bookingNotifications: BookingNotificationsService,
    private readonly audit: AuditService,
  ) {}

  planTripMeta(dto: { pickupLat: number; pickupLng: number; dropLat: number; dropLng: number; pickupCity?: string; dropCity?: string }) {
    const distanceKm = distanceKmFromCoords(dto.pickupLat, dto.pickupLng, dto.dropLat, dto.dropLng) ?? 0;
    const distMinHours = distanceMinHours(distanceKm);
    const effectiveMinHours = effectiveMinDurationHours(distanceKm);
    const bufferMinutes = bufferMinutesForTrip(dto.pickupCity, dto.dropCity);
    return {
      distanceKm,
      distanceMinHours: distMinHours,
      effectiveMinDurationHours: effectiveMinHours,
      bufferMinutes,
      maxDurationHours: MAX_BOOKING_HOURS,
    };
  }

  async checkVehicleAvailabilityFromDto(dto: {
    vehicleId: string;
    startTime: string;
    endTime: string;
    excludeBookingId?: string;
  }) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    let bufferMinutes = 120;
    if (dto.excludeBookingId) {
      const b = await this.prisma.booking.findUnique({ where: { id: dto.excludeBookingId } });
      if (b?.bufferMinutes != null) bufferMinutes = b.bufferMinutes;
      else if (b) bufferMinutes = bufferMinutesForTrip(b.pickupCity, b.dropCity);
    }
    return this.checkVehicleAvailability(dto.vehicleId, start, end, bufferMinutes, dto.excludeBookingId);
  }

  async checkVehicleAvailability(
    vehicleId: string,
    startTime: Date,
    endTime: Date,
    bufferMinutes: number,
    excludeBookingId?: string,
  ) {
    const ok = await this.matching.assertVehicleAvailableForWindow(vehicleId, startTime, endTime, bufferMinutes, excludeBookingId);
    return { available: ok };
  }

  async requestBooking(userId: string, dto: RequestBookingDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.isBlocked) throw new BadRequestException('User is blocked');

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid startTime');
    }
    if (!(endTime instanceof Date) || Number.isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid endTime');
    }
    if (endTime <= startTime) throw new BadRequestException('endTime must be after startTime');

    const pickupLocation = dto.pickupLocation.trim();
    const dropLocation = dto.dropLocation.trim();
    if (pickupLocation.length === 0) throw new BadRequestException('pickupLocation is required');
    if (dropLocation.length === 0) throw new BadRequestException('dropLocation is required');

    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours > MAX_BOOKING_HOURS) {
      throw new BadRequestException(`Booking duration may not exceed ${MAX_BOOKING_HOURS} hours`);
    }

    const distKm = distanceKmFromCoords(dto.pickupLat ?? null, dto.pickupLng ?? null, dto.dropLat ?? null, dto.dropLng ?? null);
    const effectiveMin = distKm != null ? effectiveMinDurationHours(distKm) : 10;
    if (durationHours + 1e-6 < effectiveMin) {
      throw new BadRequestException(`Duration must be at least ${effectiveMin} hours for this route`);
    }

    const bufferMinutes = bufferMinutesForTrip(dto.pickupCity, dto.dropCity);

    await this.prisma.booking.updateMany({
      where: { userId, status: 'REQUESTED' },
      data: { status: 'REJECTED' },
    });

    await this.assertUserHasNoOverlappingBooking(userId, startTime, endTime);

    const recentWindowStart = new Date(Date.now() - 2 * 60 * 1000);
    const existing = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: { in: ['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'] },
        pickupLocation,
        dropLocation,
        startTime,
        endTime,
        createdAt: { gte: recentWindowStart },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true, dispatcher: true, vehicle: true },
    });

    if (existing) {
      const options = await this.optionsForBooking(userId, existing.id);
      return { booking: existing, options };
    }

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        pickupLocation,
        dropLocation,
        pickupCity: dto.pickupCity?.trim() || null,
        dropCity: dto.dropCity?.trim() || null,
        pickupLat: dto.pickupLat ?? null,
        pickupLng: dto.pickupLng ?? null,
        dropLat: dto.dropLat ?? null,
        dropLng: dto.dropLng ?? null,
        bufferMinutes,
        startTime,
        endTime,
        status: 'REQUESTED',
      },
      include: {
        user: true,
        dispatcher: true,
        vehicle: true,
      },
    });

    await this.audit.logBookingAction({
      bookingId: booking.id,
      actorRole: 'USER',
      actorId: userId,
      action: BookingAuditAction.CREATED,
      toStatus: BookingStatus.REQUESTED,
    });

    const options = await this.optionsForBooking(userId, booking.id);

    return { booking, options };
  }

  async optionsForBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');

    const options = await this.matching.findAvailableVehicles(
      {
        startTime: booking.startTime,
        endTime: booking.endTime,
        bufferMinutes: booking.bufferMinutes ?? 120,
      },
      50,
    );
    const durationHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);

    return options.map((v: (typeof options)[number]) => ({
      vehicleId: v.id,
      dispatcherId: v.dispatcherId,
      armourLevel: v.armourLevel,
      vehicleType: v.vehicleType,
      baseRatePerHour: v.baseRatePerHour,
      location: v.location,
      dispatcherName: v.dispatcher.name,
      estimatedPrice: Math.round(v.baseRatePerHour * durationHours),
    }));
  }

  async updateSchedule(userId: string, bookingId: string, dto: UpdateBookingScheduleDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'REQUESTED') throw new BadRequestException('Only draft bookings can be rescheduled');

    const nextEnd = new Date(dto.endTime);
    if (Number.isNaN(nextEnd.getTime())) throw new BadRequestException('Invalid endTime');
    if (nextEnd <= booking.startTime) throw new BadRequestException('endTime must be after startTime');

    const durationHours = (nextEnd.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_BOOKING_HOURS) {
      throw new BadRequestException(`Booking duration may not exceed ${MAX_BOOKING_HOURS} hours`);
    }

    const distKm = distanceKmFromCoords(booking.pickupLat, booking.pickupLng, booking.dropLat, booking.dropLng);
    const effectiveMin = distKm != null ? effectiveMinDurationHours(distKm) : 10;
    if (durationHours + 1e-6 < effectiveMin) {
      throw new BadRequestException(`Duration must be at least ${effectiveMin} hours for this route`);
    }

    await this.assertUserHasNoOverlappingBooking(userId, booking.startTime, nextEnd, bookingId);

    const buf = booking.bufferMinutes ?? bufferMinutesForTrip(booking.pickupCity, booking.dropCity);

    if (dto.vehicleId) {
      const ok = await this.matching.assertVehicleAvailableForWindow(dto.vehicleId, booking.startTime, nextEnd, buf);
      if (!ok) throw new BadRequestException('Vehicle is not available for the selected window');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { endTime: nextEnd },
      include: { user: true, dispatcher: true, vehicle: true },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'USER',
      actorId: userId,
      action: BookingAuditAction.SCHEDULE_UPDATED,
      fromStatus: booking.status,
      toStatus: booking.status,
      details: { endTime: nextEnd.toISOString() },
    });
    return updated;
  }

  async selectVehicle(userId: string, bookingId: string, vehicleId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'REQUESTED') throw new BadRequestException('Booking is not selectable');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { dispatcher: true } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (!vehicle.isApproved) throw new BadRequestException('Vehicle not approved');
    if (vehicle.status !== 'AVAILABLE') throw new BadRequestException('Vehicle is not available');
    if (process.env.NODE_ENV === 'production') {
      if (!vehicle.dispatcher.isApproved || vehicle.dispatcher.isBlocked) {
        throw new BadRequestException('Dispatcher not eligible');
      }
    } else {
      if (vehicle.dispatcher.isBlocked) throw new BadRequestException('Dispatcher not eligible');
    }

    const buf = booking.bufferMinutes ?? bufferMinutesForTrip(booking.pickupCity, booking.dropCity);
    const free = await this.matching.assertVehicleAvailableForWindow(vehicleId, booking.startTime, booking.endTime, buf);
    if (!free) throw new BadRequestException('Vehicle is not available for this time range');

    const durationHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    const plannedPrice = Math.round(vehicle.baseRatePerHour * durationHours);

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.booking.update({
        where: { id: bookingId },
        data: {
          vehicleId: vehicle.id,
          dispatcherId: vehicle.dispatcherId,
          status: 'PENDING_DISPATCHER',
          pendingDispatcherAt: new Date(),
          totalPrice: plannedPrice,
        },
        include: { user: true, dispatcher: true, vehicle: true },
      });
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'BOOKED' },
      });
      return row;
    });
    this.bookingNotifications.notifyStatusChange(updated, 'REQUESTED', 'USER');
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'USER',
      actorId: userId,
      action: BookingAuditAction.VEHICLE_SELECTED,
      fromStatus: BookingStatus.REQUESTED,
      toStatus: BookingStatus.PENDING_DISPATCHER,
      details: { vehicleId },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'USER',
      actorId: userId,
      action: BookingAuditAction.STATUS_CHANGED,
      fromStatus: BookingStatus.REQUESTED,
      toStatus: BookingStatus.PENDING_DISPATCHER,
    });
    return updated;
  }

  async extendActiveBooking(userId: string, bookingId: string, dto: ExtendBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true, extensionRequests: { where: { status: 'PENDING' } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Trip must be started before requesting an extension');
    }
    if (!booking.vehicleId || !booking.vehicle) throw new BadRequestException('Vehicle missing on booking');
    if (booking.extensionRequests.length > 0) {
      throw new BadRequestException('Extension already pending dispatcher approval');
    }

    const currentDurationHours =
      (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    const maxAdditionalHours = Math.floor(MAX_BOOKING_HOURS - currentDurationHours);
    if (dto.hours > maxAdditionalHours) {
      throw new BadRequestException(
        maxAdditionalHours < 1
          ? `Booking is already at the ${MAX_BOOKING_HOURS}-hour maximum`
          : `Extension may not exceed ${maxAdditionalHours} hour(s) for this booking`,
      );
    }

    const addMs = dto.hours * 60 * 60 * 1000;
    const newEnd = new Date(booking.endTime.getTime() + addMs);

    const durationHours = (newEnd.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_BOOKING_HOURS) {
      throw new BadRequestException(`Total booking length may not exceed ${MAX_BOOKING_HOURS} hours`);
    }

    await this.assertUserHasNoOverlappingBooking(userId, booking.startTime, newEnd, booking.id);

    const buf = booking.bufferMinutes ?? bufferMinutesForTrip(booking.pickupCity, booking.dropCity);
    const ok = await this.matching.assertVehicleAvailableForWindow(
      booking.vehicleId,
      booking.startTime,
      newEnd,
      buf,
      booking.id,
    );
    if (!ok) throw new BadRequestException('Extension conflicts with another booking');

    const originalDurationHours =
      (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    const baseTotal =
      booking.totalPrice ?? Math.round(booking.vehicle.baseRatePerHour * originalDurationHours);
    const extensionRate = booking.vehicle.extensionRatePerHour ?? booking.vehicle.baseRatePerHour;
    const plannedPrice = baseTotal + Math.round(extensionRate * dto.hours);

    await this.prisma.bookingExtensionRequest.create({
      data: {
        bookingId,
        additionalHours: dto.hours,
        previousEndTime: booking.endTime,
        requestedEndTime: newEnd,
        proposedTotalPrice: plannedPrice,
        status: 'PENDING',
      },
    });

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, dispatcher: true, vehicle: true, ...extensionRequestsInclude },
    });
    if (!updated) throw new NotFoundException('Booking not found');
    this.bookingNotifications.notify('EXTENSION_REQUESTED', updated);
    return serializeBookingWithExtension(updated);
  }

  async approveExtensionRequest(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be extended');
    }
    if (!booking.vehicleId || !booking.vehicle) throw new BadRequestException('Vehicle missing on booking');

    const pending = await this.prisma.bookingExtensionRequest.findFirst({
      where: { bookingId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) throw new BadRequestException('No pending extension request');

    const newEnd = pending.requestedEndTime;
    const durationHours = (newEnd.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_BOOKING_HOURS) {
      throw new BadRequestException(`Total booking length may not exceed ${MAX_BOOKING_HOURS} hours`);
    }

    await this.assertUserHasNoOverlappingBooking(booking.userId, booking.startTime, newEnd, booking.id);

    const buf = booking.bufferMinutes ?? bufferMinutesForTrip(booking.pickupCity, booking.dropCity);
    const ok = await this.matching.assertVehicleAvailableForWindow(
      booking.vehicleId,
      booking.startTime,
      newEnd,
      buf,
      booking.id,
    );
    if (!ok) throw new BadRequestException('Extension conflicts with another booking');

    const now = new Date();
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          endTime: newEnd,
          totalPrice: pending.proposedTotalPrice,
        },
      });
      await tx.bookingExtensionRequest.update({
        where: { id: pending.id },
        data: { status: 'APPROVED', resolvedAt: now },
      });
    });

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, dispatcher: true, vehicle: true, ...extensionRequestsInclude },
    });
    if (!updated) throw new NotFoundException('Booking not found');
    this.bookingNotifications.notify('EXTENSION_APPROVED', updated);
    return serializeBookingWithExtension(updated);
  }

  async cancelExtensionRequest(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    return this.rejectPendingExtensionRequest(bookingId, false);
  }

  async declineExtensionRequest(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    return this.rejectPendingExtensionRequest(bookingId, true);
  }

  private async rejectPendingExtensionRequest(bookingId: string, notifyUser: boolean) {
    const pending = await this.prisma.bookingExtensionRequest.findFirst({
      where: { bookingId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) throw new BadRequestException('No pending extension request');

    await this.prisma.bookingExtensionRequest.update({
      where: { id: pending.id },
      data: { status: 'REJECTED', resolvedAt: new Date() },
    });

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, dispatcher: true, vehicle: true, ...extensionRequestsInclude },
    });
    if (!updated) throw new NotFoundException('Booking not found');
    if (notifyUser) {
      this.bookingNotifications.notify('EXTENSION_DECLINED', updated);
    }
    return serializeBookingWithExtension(updated);
  }

  async listForUser(userId: string) {
    await expireStalePendingDispatcherBookings(this.prisma);
    const rows = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        dispatcher: true,
        vehicle: true,
        ...extensionRequestsInclude,
      },
    });
    return rows.map((row) => withPendingExpiryFields(serializeBookingWithExtension(row)));
  }

  async cancelForUser(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (!['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking is not cancellable');
    }

    const vid = booking.vehicleId;
    const previousStatus = booking.status;
    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REJECTED',
          actualEndTime: booking.actualEndTime ?? (booking.status === 'IN_PROGRESS' ? new Date() : booking.actualEndTime),
          ...(vid ? { vehicleId: null, dispatcherId: null } : {}),
        },
        include: { user: true, dispatcher: true, vehicle: true },
      });
      if (vid) {
        await tx.vehicle.updateMany({
          where: { id: vid, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }
      return row;
    });
    this.bookingNotifications.notifyStatusChange(
      { ...updated, dispatcherId: updated.dispatcherId ?? booking.dispatcherId },
      previousStatus,
      'USER',
    );
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'USER',
      actorId: userId,
      action: BookingAuditAction.CANCELLED,
      fromStatus: previousStatus as BookingStatus,
      toStatus: BookingStatus.REJECTED,
    });
    return updated;
  }

  private async assertUserHasNoOverlappingBooking(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ) {
    const others = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { in: [...USER_ACTIVE_BOOKING_STATUSES] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startTime: true, endTime: true },
    });

    for (const b of others) {
      if (startTime < b.endTime && endTime > b.startTime) {
        throw new BadRequestException('You already have a booking during this time');
      }
    }
  }
}
