import { Controller, Get, Param, Query } from '@nestjs/common';
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
      types: types.length > 0 ? types : (['B4', 'B5', 'B6', 'B7'] as const),
    };
  }

  @Get('available')
  async listAvailableVehicles(
    @Query('types') typesParam?: string,
    @Query('city') city?: string,
    @Query('carType') carType?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const types = (typesParam ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => ['B4', 'B5', 'B6', 'B7'].includes(t));

    const min = Number(minPrice);
    const max = Number(maxPrice);
    const hasMin = Number.isFinite(min);
    const hasMax = Number.isFinite(max);

    const rows = await this.prisma.vehicle.findMany({
      where: {
        isApproved: true,
        ...(types.length > 0 ? { type: { in: types as any } } : {}),
        ...(city && city.trim().length > 0 ? { location: { contains: city.trim(), mode: 'insensitive' } } : {}),
        ...(carType && carType.trim().length > 0
          ? {
              OR: [
                { manufacturer: { contains: carType.trim(), mode: 'insensitive' } },
                { generation: { contains: carType.trim(), mode: 'insensitive' } },
                { carModel: { contains: carType.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(hasMin || hasMax
          ? {
              baseRatePerHour: {
                ...(hasMin ? { gte: Math.round(min) } : {}),
                ...(hasMax ? { lte: Math.round(max) } : {}),
              },
            }
          : {}),
      },
      include: {
        driver: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ baseRatePerHour: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      vehicles: rows.map((v) => ({
        id: v.id,
        imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
        manufacturer: v.manufacturer,
        generation: v.generation,
        carModel: v.carModel,
        year: v.year,
        color: v.color,
        numberPlate: v.numberPlate,
        registrationNumber: v.registrationNumber,
        type: v.type,
        location: v.location,
        baseRatePerHour: v.baseRatePerHour,
        rating: 4.8,
        owner: {
          id: v.driver?.id ?? '',
          name: v.driver?.name ?? 'Owner',
          rating: 4.9,
        },
      })),
    };
  }

  @Get(':id')
  async getVehicleDetails(@Param('id') id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, isApproved: true },
      include: {
        driver: {
          select: { id: true, name: true },
        },
      },
    });

    if (!v) return { vehicle: null };

    const featuresByLevel: Record<string, string[]> = {
      B4: ['Bullet-resistant glass', 'Reinforced doors', 'Emergency communication'],
      B5: ['Bulletproof glass', 'Run-flat tires', 'Underbody reinforcement'],
      B6: ['Military-grade body armor', 'Run-flat tires', 'Fire suppression'],
      B7: ['High-caliber ballistic protection', 'Blast-resistant floor', 'Advanced emergency systems'],
    };

    return {
      vehicle: {
        id: v.id,
        imageUrls: Array.isArray(v.imageUrls) ? v.imageUrls : [],
        manufacturer: v.manufacturer,
        generation: v.generation,
        carModel: v.carModel,
        year: v.year,
        color: v.color,
        numberPlate: v.numberPlate,
        registrationNumber: v.registrationNumber,
        type: v.type,
        location: v.location,
        baseRatePerHour: v.baseRatePerHour,
        certification: v.registrationNumber ? `Certified (${v.registrationNumber})` : `Certified (${v.type})`,
        condition: v.year && v.year >= new Date().getFullYear() - 2 ? 'Excellent condition' : 'Operational condition',
        features: featuresByLevel[v.type] ?? ['Bullet-resistant body', 'Secured transport'],
        owner: {
          id: v.driver?.id ?? '',
          name: v.driver?.name ?? 'Owner',
          rating: 4.9,
        },
      },
    };
  }
}

