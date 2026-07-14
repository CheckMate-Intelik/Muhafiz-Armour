import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingAuditAction, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BookingService } from '../booking/booking.service';
import { extensionRequestsInclude, serializeBookingWithExtension } from '../booking/booking-extension.util';
import {
  expirePendingBookingIfNeeded,
  expireStalePendingDispatcherBookings,
  withPendingExpiryFields,
} from '../booking/booking-pending-expiry.util';
import { UpdateDispatcherProfileDto } from './dto/update-dispatcher-profile.dto';
import { BookingNotificationsService } from '../notifications/booking-notifications.service';

@Injectable()
export class DispatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingService,
    private readonly bookingNotifications: BookingNotificationsService,
    private readonly audit: AuditService,
  ) {}

  async getById(id: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
      },
    });
    if (!dispatcher) throw new NotFoundException('Dispatcher not found');
    return dispatcher;
  }

  async updateProfile(id: string, dto: UpdateDispatcherProfileDto) {
    const existing = await this.prisma.dispatcher.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Dispatcher not found');

    const profileImageUrl =
      dto.profileImageUrl === undefined
        ? undefined
        : dto.profileImageUrl === null || String(dto.profileImageUrl).trim() === ''
          ? null
          : String(dto.profileImageUrl).trim();

    return this.prisma.dispatcher.update({
      where: { id },
      data: profileImageUrl === undefined ? {} : { profileImageUrl },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async listMyRequests(dispatcherId: string) {
    await expireStalePendingDispatcherBookings(this.prisma, { audit: this.audit });
    const rows = await this.prisma.booking.findMany({
      where: { dispatcherId, status: 'PENDING_DISPATCHER' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
    return rows.map((row) => withPendingExpiryFields(row));
  }

  async listMyActive(dispatcherId: string) {
    await expireStalePendingDispatcherBookings(this.prisma, { audit: this.audit });
    const rows = await this.prisma.booking.findMany({
      where: { dispatcherId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true, ...extensionRequestsInclude },
    });
    return rows.map((row) => withPendingExpiryFields(serializeBookingWithExtension(row)));
  }

  async approveExtension(dispatcherId: string, bookingId: string) {
    return this.bookings.approveExtensionRequest(dispatcherId, bookingId);
  }

  async declineExtension(dispatcherId: string, bookingId: string) {
    return this.bookings.declineExtensionRequest(dispatcherId, bookingId);
  }

  async listMyCompleted(dispatcherId: string) {
    return this.prisma.booking.findMany({
      where: { dispatcherId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
  }

  async respondToBooking(dispatcherId: string, bookingId: string, accept: boolean) {
    await expirePendingBookingIfNeeded(this.prisma, bookingId, { audit: this.audit });
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your request');
    if (booking.status === 'EXPIRED') {
      throw new BadRequestException('Booking request has expired');
    }
    if (booking.status !== 'PENDING_DISPATCHER') {
      throw new BadRequestException('Booking is not pending dispatcher');
    }

    const previousStatus = booking.status;

    if (!accept) {
      const vid = booking.vehicleId;
      const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const row = await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'REJECTED' },
          include: { user: true, vehicle: true, dispatcher: true },
        });
        if (vid) {
          await tx.vehicle.updateMany({
            where: { id: vid, status: 'BOOKED' },
            data: { status: 'AVAILABLE' },
          });
        }
        return row;
      });
      this.bookingNotifications.notifyStatusChange(updated, previousStatus, 'DISPATCHER');
      await this.audit.logBookingAction({
        bookingId,
        actorRole: 'DISPATCHER',
        actorId: dispatcherId,
        action: BookingAuditAction.DISPATCHER_REJECTED,
        fromStatus: previousStatus as BookingStatus,
        toStatus: BookingStatus.REJECTED,
        details: {
          vehicleId: booking.vehicleId ?? undefined,
          dispatcherId,
        },
      });
      return updated;
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
    this.bookingNotifications.notifyStatusChange(updated, previousStatus, 'DISPATCHER');
    return updated;
  }

  async startBooking(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Booking must be CONFIRMED to start');

    const previousStatus = booking.status;
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS', actualStartTime: new Date() },
      include: { user: true, vehicle: true, dispatcher: true },
    });
    this.bookingNotifications.notifyStatusChange(updated, previousStatus, 'DISPATCHER');
    return updated;
  }

  async completeBooking(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'IN_PROGRESS') throw new BadRequestException('Booking must be IN_PROGRESS to complete');
    if (!booking.vehicle) throw new BadRequestException('Vehicle missing');

    const actualEndTime = new Date();
    const overtimeMinutes = this.calculateOvertimeMinutes(booking.endTime, actualEndTime);

    const plannedMinutes = Math.max(0, Math.ceil((booking.endTime.getTime() - booking.startTime.getTime()) / 60000));
    const plannedHours = plannedMinutes / 60;
    const overtimeHours = overtimeMinutes ? overtimeMinutes / 60 : 0;
    const totalPrice = Math.round(booking.vehicle.baseRatePerHour * (plannedHours + overtimeHours));

    const vid = booking.vehicleId;
    const previousStatus = booking.status;
    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'COMPLETED',
          actualEndTime,
          overtimeMinutes,
          totalPrice,
        },
        include: { user: true, vehicle: true, dispatcher: true },
      });
      if (vid) {
        await tx.vehicle.updateMany({
          where: { id: vid, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }
      return row;
    });
    this.bookingNotifications.notifyStatusChange(updated, previousStatus, 'DISPATCHER');
    return updated;
  }

  async cancelBooking(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
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
        },
        include: { user: true, vehicle: true, dispatcher: true },
      });
      if (vid) {
        await tx.vehicle.updateMany({
          where: { id: vid, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }
      return row;
    });
    this.bookingNotifications.notifyStatusChange(updated, previousStatus, 'DISPATCHER');
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'DISPATCHER',
      actorId: dispatcherId,
      action: BookingAuditAction.DISPATCHER_CANCELLED,
      fromStatus: previousStatus as BookingStatus,
      toStatus: BookingStatus.REJECTED,
      details: {
        vehicleId: booking.vehicleId ?? undefined,
        dispatcherId,
      },
    });
    return updated;
  }

  private calculateOvertimeMinutes(plannedEnd: Date, actualEnd: Date) {
    const diffMs = actualEnd.getTime() - plannedEnd.getTime();
    if (diffMs <= 0) return null;
    return Math.ceil(diffMs / 60000);
  }
}
