import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleService } from './vehicle.service';

@Controller('driver/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DRIVER')
export class VehicleController {
  constructor(private readonly vehicles: VehicleService) {}

  @Post()
  async create(@AuthUser() user: JwtPayload, @Body() dto: CreateVehicleDto) {
    return this.vehicles.createForDriver(user.sub, dto);
  }

  @Get()
  async list(@AuthUser() user: JwtPayload) {
    return this.vehicles.listForDriver(user.sub);
  }
}

