import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { RequestBookingDto } from './dto/request-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

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

    // Idempotency: if the same user submits the same request multiple times
    // (double-tap, flaky networks, retries), reuse the most recent non-terminal booking.
    // This also protects against races where the first request is already moved to
    // PENDING_DRIVER before the second request arrives.
    const recentWindowStart = new Date(Date.now() - 2 * 60 * 1000);
    const existing = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: { in: ['REQUESTED', 'PENDING_DRIVER', 'CONFIRMED', 'IN_PROGRESS'] },
        pickupLocation,
        dropLocation,
        startTime,
        endTime,
        createdAt: { gte: recentWindowStart },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true, driver: true, vehicle: true },
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
        startTime,
        endTime,
        status: 'REQUESTED',
      },
      include: {
        user: true,
        driver: true,
        vehicle: true,
      },
    });

    const options = await this.optionsForBooking(userId, booking.id);

    return { booking, options };
  }

  async optionsForBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');

    const options = await this.matching.findAvailableVehicles(
      { startTime: booking.startTime, endTime: booking.endTime },
      5,
    );
    const durationHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);

    return options.map((v: (typeof options)[number]) => ({
      vehicleId: v.id,
      driverId: v.driverId,
      armourLevel: v.armourLevel,
      vehicleType: v.vehicleType,
      baseRatePerHour: v.baseRatePerHour,
      location: v.location,
      driverName: v.driver.name,
      estimatedPrice: Math.round(v.baseRatePerHour * durationHours),
    }));
  }

  async selectVehicle(userId: string, bookingId: string, vehicleId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (booking.status !== 'REQUESTED') throw new BadRequestException('Booking is not selectable');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driver: true } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (!vehicle.isApproved) throw new BadRequestException('Vehicle not approved');
    if (process.env.NODE_ENV === 'production') {
      if (!vehicle.driver.isApproved || vehicle.driver.isBlocked) throw new BadRequestException('Driver not eligible');
    } else {
      if (vehicle.driver.isBlocked) throw new BadRequestException('Driver not eligible');
    }

    const durationHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    const plannedPrice = Math.round(vehicle.baseRatePerHour * durationHours);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        status: 'PENDING_DRIVER',
        totalPrice: plannedPrice,
      },
      include: { user: true, driver: true, vehicle: true },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async cancelForUser(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (!['REQUESTED', 'PENDING_DRIVER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking is not cancellable');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'REJECTED',
        actualEndTime: booking.actualEndTime ?? (booking.status === 'IN_PROGRESS' ? new Date() : booking.actualEndTime),
      },
      include: { user: true, driver: true, vehicle: true },
    });
  }
}

