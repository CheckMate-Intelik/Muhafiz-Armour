import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type MatchRequest = {
  startTime: Date;
  endTime: Date;
};

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableVehicles(req: MatchRequest, limit = 5) {
    const { startTime, endTime } = req;

    const enforceApprovals = process.env.NODE_ENV === 'production';

    return this.prisma.vehicle.findMany({
      where: {
        isApproved: true,
        driver: enforceApprovals ? { isApproved: true, isBlocked: false } : { isBlocked: false },
        bookings: {
          none: {
            status: { in: ['PENDING_DRIVER', 'CONFIRMED', 'IN_PROGRESS'] },
            AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
          },
        },
      },
      include: { driver: true },
      orderBy: [{ baseRatePerHour: 'asc' }],
      take: Math.max(1, Math.min(5, limit)),
    });
  }
}

