import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDispatcherProfileDto } from './dto/update-dispatcher-profile.dto';

@Injectable()
export class DispatcherService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.booking.findMany({
      where: { dispatcherId, status: 'PENDING_DISPATCHER' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
  }

  async listMyActive(dispatcherId: string) {
    return this.prisma.booking.findMany({
      where: { dispatcherId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
  }

  async listMyCompleted(dispatcherId: string) {
    return this.prisma.booking.findMany({
      where: { dispatcherId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
  }

  async respondToBooking(dispatcherId: string, bookingId: string, accept: boolean) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your request');
    if (booking.status !== 'PENDING_DISPATCHER') {
      throw new BadRequestException('Booking is not pending dispatcher');
    }

    if (!accept) {
      const vid = booking.vehicleId;
      return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: { status: 'REJECTED', vehicleId: null, dispatcherId: null },
          include: { user: true, vehicle: true, dispatcher: true },
        });
        if (vid) {
          await tx.vehicle.updateMany({
            where: { id: vid, status: 'BOOKED' },
            data: { status: 'AVAILABLE' },
          });
        }
        return updated;
      });
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: { user: true, vehicle: true, dispatcher: true },
    });
  }

  async startBooking(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Booking must be CONFIRMED to start');

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS', actualStartTime: new Date() },
      include: { user: true, vehicle: true, dispatcher: true },
    });
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
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
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
      return updated;
    });
  }

  async cancelBooking(dispatcherId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.dispatcherId !== dispatcherId) throw new BadRequestException('Not your booking');
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking is not cancellable');
    }

    const vid = booking.vehicleId;
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REJECTED',
          actualEndTime: booking.actualEndTime ?? (booking.status === 'IN_PROGRESS' ? new Date() : booking.actualEndTime),
          vehicleId: null,
          dispatcherId: null,
        },
        include: { user: true, vehicle: true, dispatcher: true },
      });
      if (vid) {
        await tx.vehicle.updateMany({
          where: { id: vid, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }
      return updated;
    });
  }

  private calculateOvertimeMinutes(plannedEnd: Date, actualEnd: Date) {
    const diffMs = actualEnd.getTime() - plannedEnd.getTime();
    if (diffMs <= 0) return null;
    return Math.ceil(diffMs / 60000);
  }
}
