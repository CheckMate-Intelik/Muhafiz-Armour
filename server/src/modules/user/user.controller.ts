import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  async me(@AuthUser() user: JwtPayload) {
    return this.users.getById(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  async patchMe(@AuthUser() user: JwtPayload, @Body() dto: UpdateUserProfileDto) {
    return this.users.updateProfile(user.sub, dto);
  }
}

