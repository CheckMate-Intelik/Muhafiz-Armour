import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  async metrics() {
    return this.admin.metrics();
  }

  @Get('bookings')
  async listBookings() {
    return this.admin.listBookings();
  }

  @Get('drivers')
  async listDrivers() {
    return this.admin.listDrivers();
  }

  @Patch('drivers/:id/approve')
  async approveDriver(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setDriverApproval(id, dto.isApproved);
  }

  @Patch('drivers/:id/block')
  async blockDriver(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setDriverBlock(id, dto.isBlocked);
  }

  @Get('vehicles')
  async listVehicles() {
    return this.admin.listVehicles();
  }

  @Patch('vehicles/:id/approve')
  async approveVehicle(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setVehicleApproval(id, dto.isApproved);
  }

  @Get('users')
  async listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/block')
  async blockUser(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setUserBlock(id, dto.isBlocked);
  }
}

