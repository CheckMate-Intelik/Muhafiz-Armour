import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  bufferMinutesForTrip,
  distanceKmFromCoords,
  distanceMinHours,
  effectiveMinDurationHours,
} from '../../common/trip-planning';
import { MatchingService } from '../matching/matching.service';
import { RequestBookingDto } from './dto/request-booking.dto';
import { UpdateBookingScheduleDto } from './dto/update-booking-schedule.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';

const MAX_BOOKING_HOURS = 5 * 24;

const USER_ACTIVE_BOOKING_STATUSES: Array<
  'REQUESTED' | 'PENDING_DISPATCHER' | 'CONFIRMED' | 'IN_PROGRESS'
> = ['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'];

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
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

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { endTime: nextEnd },
      include: { user: true, dispatcher: true, vehicle: true },
    });
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

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          vehicleId: vehicle.id,
          dispatcherId: vehicle.dispatcherId,
          status: 'PENDING_DISPATCHER',
          totalPrice: plannedPrice,
        },
        include: { user: true, dispatcher: true, vehicle: true },
      });
      await tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'BOOKED' },
      });
      return updated;
    });
  }

  async extendActiveBooking(userId: string, bookingId: string, dto: ExtendBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be extended');
    }
    if (!booking.vehicleId || !booking.vehicle) throw new BadRequestException('Vehicle missing on booking');

    const addMs = dto.mode === 'ADD_2_HOURS' ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
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

    const plannedPrice = Math.round(booking.vehicle.baseRatePerHour * durationHours);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        endTime: newEnd,
        totalPrice: plannedPrice,
      },
      include: { user: true, dispatcher: true, vehicle: true },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        dispatcher: true,
        vehicle: true,
      },
    });
  }

  async cancelForUser(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) throw new BadRequestException('Not your booking');
    if (!['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking is not cancellable');
    }

    const vid = booking.vehicleId;
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.booking.update({
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
      return updated;
    });
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
