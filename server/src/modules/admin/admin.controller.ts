import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { UpdateApprovalDto } from './dto/update-approval.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  async metrics() {
    return this.admin.metrics();
  }

  @Get('bookings/lookup')
  async lookupBooking(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getBooking(id.trim());
  }

  @Get('bookings')
  async listBookings() {
    return this.admin.listBookings();
  }

  @Get('dispatchers/lookup')
  async lookupDispatcher(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getDispatcher(id.trim());
  }

  @Get('dispatchers')
  async listDispatchers() {
    return this.admin.listDispatchers();
  }

  @Patch('dispatchers/:id/approve')
  async approveDispatcher(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setDispatcherApproval(admin.sub, id, dto.isApproved);
  }

  @Patch('dispatchers/:id/block')
  async blockDispatcher(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setDispatcherBlock(admin.sub, id, dto.isBlocked);
  }

  @Get('vehicles/lookup')
  async lookupVehicle(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getVehicle(id.trim());
  }

  @Get('vehicles')
  async listVehicles() {
    return this.admin.listVehicles();
  }

  @Patch('vehicles/:id/approve')
  async approveVehicle(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setVehicleApproval(admin.sub, id, dto.isApproved);
  }

  @Patch('vehicles/:id')
  async updateVehicle(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.admin.updateVehicle(admin.sub, id, dto);
  }

  @Get('users/lookup')
  async lookupUser(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getUser(id.trim());
  }

  @Get('users')
  async listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/block')
  async blockUser(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setUserBlock(admin.sub, id, dto.isBlocked);
  }

  @Get('armour-level-options')
  async listArmourLevelOptions() {
    return this.admin.listArmourLevelOptions();
  }

  @Post('armour-level-options')
  async createArmourLevelOption(@AuthUser() admin: JwtPayload, @Body() dto: CreateCatalogOptionDto) {
    return this.admin.createArmourLevelOption(admin.sub, dto);
  }

  @Patch('armour-level-options/:id')
  async updateArmourLevelOption(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.admin.updateArmourLevelOption(admin.sub, id, dto);
  }

  @Delete('armour-level-options/:id')
  async deleteArmourLevelOption(@AuthUser() admin: JwtPayload, @Param('id') id: string) {
    return this.admin.deleteArmourLevelOption(admin.sub, id);
  }

  @Get('vehicle-type-options')
  async listVehicleTypeOptions() {
    return this.admin.listVehicleTypeOptions();
  }

  @Post('vehicle-type-options')
  async createVehicleTypeOption(@AuthUser() admin: JwtPayload, @Body() dto: CreateCatalogOptionDto) {
    return this.admin.createVehicleTypeOption(admin.sub, dto);
  }

  @Patch('vehicle-type-options/:id')
  async updateVehicleTypeOption(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.admin.updateVehicleTypeOption(admin.sub, id, dto);
  }

  @Delete('vehicle-type-options/:id')
  async deleteVehicleTypeOption(@AuthUser() admin: JwtPayload, @Param('id') id: string) {
    return this.admin.deleteVehicleTypeOption(admin.sub, id);
  }
}
