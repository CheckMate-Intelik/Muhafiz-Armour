import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { DispatcherService } from './dispatcher.service';
import { RespondDto } from './dto/respond.dto';
import { UpdateDispatcherProfileDto } from './dto/update-dispatcher-profile.dto';

@Controller('dispatcher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DISPATCHER')
export class DispatcherController {
  constructor(private readonly dispatchers: DispatcherService) {}

  @Get('requests')
  async requests(@AuthUser() user: JwtPayload) {
    return this.dispatchers.listMyRequests(user.sub);
  }

  @Get('me')
  async me(@AuthUser() user: JwtPayload) {
    return this.dispatchers.getById(user.sub);
  }

  @Patch('me')
  async patchMe(@AuthUser() user: JwtPayload, @Body() dto: UpdateDispatcherProfileDto) {
    return this.dispatchers.updateProfile(user.sub, dto);
  }

  @Get('bookings/active')
  async active(@AuthUser() user: JwtPayload) {
    return this.dispatchers.listMyActive(user.sub);
  }

  @Get('bookings/completed')
  async completed(@AuthUser() user: JwtPayload) {
    return this.dispatchers.listMyCompleted(user.sub);
  }

  @Patch('bookings/:id/respond')
  async respond(@AuthUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RespondDto) {
    return this.dispatchers.respondToBooking(user.sub, id, dto.accept);
  }

  @Patch('bookings/:id/start')
  async start(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatchers.startBooking(user.sub, id);
  }

  @Patch('bookings/:id/complete')
  async complete(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatchers.completeBooking(user.sub, id);
  }

  @Patch('bookings/:id/cancel')
  async cancel(@AuthUser() user: JwtPayload, @Param('id') id: string) {
    return this.dispatchers.cancelBooking(user.sub, id);
  }
}
