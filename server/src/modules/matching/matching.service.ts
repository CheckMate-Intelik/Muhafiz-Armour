import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type MatchRequest = {
  startTime: Date;
  endTime: Date;
  bufferMinutes?: number | null;
};

type ActiveBookingSlice = {
  startTime: Date;
  endTime: Date;
  bufferMinutes: number | null;
};

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  /** True if [start,end] expanded by bufferMinutes conflicts with any active booking (each expanded by its own buffer). */
  bookingsConflict(bookings: ActiveBookingSlice[], start: Date, end: Date, bufferMinutes: number): boolean {
    const pad = bufferMinutes * 60 * 1000;
    const ns = new Date(start.getTime() - pad);
    const ne = new Date(end.getTime() + pad);
    for (const b of bookings) {
      const ob = (b.bufferMinutes ?? 120) * 60 * 1000;
      const os = new Date(b.startTime.getTime() - ob);
      const oe = new Date(b.endTime.getTime() + ob);
      if (ns < oe && ne > os) return true;
    }
    return false;
  }

  async assertVehicleAvailableForWindow(
    vehicleId: string,
    start: Date,
    end: Date,
    bufferMinutes: number,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const rows = await this.prisma.booking.findMany({
      where: {
        vehicleId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        status: { in: ['PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { startTime: true, endTime: true, bufferMinutes: true },
    });
    return !this.bookingsConflict(rows, start, end, bufferMinutes);
  }

  async findAvailableVehicles(req: MatchRequest, limit = 50) {
    const { startTime, endTime } = req;
    const bufferMinutes = req.bufferMinutes ?? 120;

    const enforceApprovals = process.env.NODE_ENV === 'production';

    const rows = await this.prisma.vehicle.findMany({
      where: {
        isApproved: true,
        status: 'AVAILABLE',
        dispatcher: enforceApprovals ? { isApproved: true, isBlocked: false } : { isBlocked: false },
      },
      include: {
        dispatcher: true,
        bookings: {
          where: { status: { in: ['PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'] } },
          select: { startTime: true, endTime: true, bufferMinutes: true },
        },
      },
      orderBy: [{ baseRatePerHour: 'asc' }, { createdAt: 'desc' }],
      take: Math.max(1, Math.min(200, limit * 10)),
    });

    const filtered = rows.filter((v: any) => !this.bookingsConflict(v.bookings, startTime, endTime, bufferMinutes));
    return filtered.slice(0, Math.max(1, Math.min(50, limit)));
  }
}
