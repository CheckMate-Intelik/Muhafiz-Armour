import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BookingService } from './booking.service';
import { RequestBookingDto } from './dto/request-booking.dto';
import { SelectVehicleDto } from './dto/select-vehicle.dto';
import { PlanTripMetaDto } from './dto/plan-trip-meta.dto';
import { UpdateBookingScheduleDto } from './dto/update-booking-schedule.dto';
import { ExtendBookingDto } from './dto/extend-booking.dto';
import { CheckVehicleAvailabilityDto } from './dto/check-vehicle-availability.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Post('plan-meta')
  planMeta(@Body() dto: PlanTripMetaDto) {
    return this.bookings.planTripMeta(dto);
  }

  @Post('check-availability')
  checkAvailability(@Body() dto: CheckVehicleAvailabilityDto) {
    return this.bookings.checkVehicleAvailabilityFromDto(dto);
  }

  @Post('request')
  async request(@AuthUser() user: JwtPayload, @Body() dto: RequestBookingDto) {
    return this.bookings.requestBooking(user.sub, dto);
  }

  @Patch(':id/schedule')
  async updateSchedule(@AuthUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateBookingScheduleDto) {
    return this.bookings.updateSchedule(user.sub, id, dto);
  }

  @Post(':id/extend')
  async extend(@AuthUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ExtendBookingDto) {
    return this.bookings.extendActiveBooking(user.sub, id, dto);
  }

  @Patch(':id/extend/cancel')
  async cancelExtension(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookings.cancelExtensionRequest(user.sub, id);
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

  @Patch(':id/cancel')
  async cancel(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.bookings.cancelForUser(user.sub, id);
  }
}
