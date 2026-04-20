import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BookingService } from './booking.service';
import { RequestBookingDto } from './dto/request-booking.dto';
import { SelectVehicleDto } from './dto/select-vehicle.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Post('request')
  async request(@AuthUser() user: JwtPayload, @Body() dto: RequestBookingDto) {
    return this.bookings.requestBooking(user.sub, dto);
  }

  @Post(':id/select')
  async select(@AuthUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SelectVehicleDto) {
    return this.bookings.selectVehicle(user.sub, id, dto.vehicleId);
  }

  @Get(':id/options')
  async options(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return { options: await this.bookings.optionsForBooking(user.sub, id) };
  }

  @Get()
  async list(@AuthUser() user: JwtPayload) {
    return this.bookings.listForUser(user.sub);
  }
}

