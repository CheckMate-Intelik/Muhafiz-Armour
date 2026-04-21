import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { DriverService } from './driver.service';
import { RespondDto } from './dto/respond.dto';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DRIVER')
export class DriverController {
  constructor(private readonly drivers: DriverService) {}

  @Get('requests')
  async requests(@AuthUser() user: JwtPayload) {
    return this.drivers.listMyRequests(user.sub);
  }

  @Get('me')
  async me(@AuthUser() user: JwtPayload) {
    return this.drivers.getById(user.sub);
  }

  @Get('bookings/active')
  async active(@AuthUser() user: JwtPayload) {
    return this.drivers.listMyActive(user.sub);
  }

  @Get('bookings/completed')
  async completed(@AuthUser() user: JwtPayload) {
    return this.drivers.listMyCompleted(user.sub);
  }

  @Patch('bookings/:id/respond')
  async respond(@AuthUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.drivers.respondToBooking(user.sub, id, dto.accept);
  }

  @Patch('bookings/:id/start')
  async start(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.drivers.startBooking(user.sub, id);
  }

  @Patch('bookings/:id/complete')
  async complete(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.drivers.completeBooking(user.sub, id);
  }

  @Patch('bookings/:id/cancel')
  async cancel(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.drivers.cancelBooking(user.sub, id);
  }
}

