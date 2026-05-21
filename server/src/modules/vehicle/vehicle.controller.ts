import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleService } from './vehicle.service';

@Controller('dispatcher/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DISPATCHER')
export class VehicleController {
  constructor(private readonly vehicles: VehicleService) {}

  @Post()
  async create(@AuthUser() user: JwtPayload, @Body() dto: CreateVehicleDto) {
    return this.vehicles.createForDispatcher(user.sub, dto);
  }

  @Get()
  async list(@AuthUser() user: JwtPayload) {
    return this.vehicles.listForDispatcher(user.sub);
  }

  @Get(':id')
  async details(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    const v = await this.vehicles.getForDispatcherById(user.sub, id);
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
        armourLevel: v.armourLevel,
        vehicleType: v.vehicleType,
        location: v.location,
        baseRatePerHour: v.baseRatePerHour,
        extensionRatePerHour: v.extensionRatePerHour,
        certification: v.registrationNumber ? `Certified (${v.registrationNumber})` : `Certified (${v.armourLevel})`,
        condition: v.year && v.year >= new Date().getFullYear() - 2 ? 'Excellent condition' : 'Operational condition',
        features: featuresByLevel[v.armourLevel] ?? ['Bullet-resistant body', 'Secured transport'],
        owner: {
          id: v.dispatcher?.id ?? '',
          name: v.dispatcher?.name ?? 'Owner',
          rating: 4.9,
        },
      },
    };
  }
}
