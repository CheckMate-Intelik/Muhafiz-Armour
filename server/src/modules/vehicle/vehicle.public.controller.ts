import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('vehicles')
export class VehiclePublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('types')
  async listVehicleTypes() {
    const rows = await this.prisma.vehicle.findMany({
      where: { isApproved: true },
      select: { type: true },
      distinct: ['type'],
    });

    const types = rows.map((r) => r.type).sort();

    return {
      types: types.length > 0 ? types : (['LA', 'MA', 'HA'] as const),
    };
  }
}

