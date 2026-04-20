import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async listMyRequests(driverId: string) {
    return this.prisma.booking.findMany({
      where: { driverId, status: 'PENDING_DRIVER' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  async listMyActive(driverId: string) {
    return this.prisma.booking.findMany({
      where: { driverId, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  async listMyCompleted(driverId: string) {
    return this.prisma.booking.findMany({
      where: { driverId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  async respondToBooking(driverId: string, bookingId: string, accept: boolean) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driverId !== driverId) throw new BadRequestException('Not your request');
    if (booking.status !== 'PENDING_DRIVER') throw new BadRequestException('Booking is not pending driver');

    if (!accept) {
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'REJECTED' },
        include: { user: true, vehicle: true, driver: true },
      });
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  async startBooking(driverId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driverId !== driverId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'CONFIRMED') throw new BadRequestException('Booking must be CONFIRMED to start');

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'IN_PROGRESS', actualStartTime: new Date() },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  async completeBooking(driverId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.driverId !== driverId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'IN_PROGRESS') throw new BadRequestException('Booking must be IN_PROGRESS to complete');
    if (!booking.vehicle) throw new BadRequestException('Vehicle missing');

    const actualEndTime = new Date();
    const overtimeMinutes = this.calculateOvertimeMinutes(booking.endTime, actualEndTime);

    const plannedMinutes = Math.max(0, Math.ceil((booking.endTime.getTime() - booking.startTime.getTime()) / 60000));
    const plannedHours = plannedMinutes / 60;
    const overtimeHours = overtimeMinutes ? overtimeMinutes / 60 : 0;
    const totalPrice = Math.round(booking.vehicle.baseRatePerHour * (plannedHours + overtimeHours));

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        actualEndTime,
        overtimeMinutes,
        totalPrice,
      },
      include: { user: true, vehicle: true, driver: true },
    });
  }

  private calculateOvertimeMinutes(plannedEnd: Date, actualEnd: Date) {
    const diffMs = actualEnd.getTime() - plannedEnd.getTime();
    if (diffMs <= 0) return null;
    return Math.ceil(diffMs / 60000);
  }
}

