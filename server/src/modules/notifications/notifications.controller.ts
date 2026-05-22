import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RegisterPushTokenDto, UnregisterPushTokenDto } from './dto/register-push-token.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('register')
  @Roles('USER', 'DISPATCHER')
  async register(@AuthUser() user: JwtPayload, @Body() dto: RegisterPushTokenDto) {
    return this.notifications.register(user, dto);
  }

  @Delete('register')
  @Roles('USER', 'DISPATCHER')
  async unregister(@AuthUser() user: JwtPayload, @Body() dto: UnregisterPushTokenDto) {
    return this.notifications.unregister(user, dto);
  }
}
