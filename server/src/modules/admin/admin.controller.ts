import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  async approveDispatcher(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setDispatcherApproval(id, dto.isApproved);
  }

  @Patch('dispatchers/:id/block')
  async blockDispatcher(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setDispatcherBlock(id, dto.isBlocked);
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
  async approveVehicle(@Param('id') id: string, @Body() dto: UpdateApprovalDto) {
    return this.admin.setVehicleApproval(id, dto.isApproved);
  }

  @Patch('vehicles/:id')
  async updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.admin.updateVehicle(id, dto);
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
  async blockUser(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.admin.setUserBlock(id, dto.isBlocked);
  }

  @Get('armour-level-options')
  async listArmourLevelOptions() {
    return this.admin.listArmourLevelOptions();
  }

  @Post('armour-level-options')
  async createArmourLevelOption(@Body() dto: CreateCatalogOptionDto) {
    return this.admin.createArmourLevelOption(dto);
  }

  @Patch('armour-level-options/:id')
  async updateArmourLevelOption(@Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.admin.updateArmourLevelOption(id, dto);
  }

  @Delete('armour-level-options/:id')
  async deleteArmourLevelOption(@Param('id') id: string) {
    return this.admin.deleteArmourLevelOption(id);
  }

  @Get('vehicle-type-options')
  async listVehicleTypeOptions() {
    return this.admin.listVehicleTypeOptions();
  }

  @Post('vehicle-type-options')
  async createVehicleTypeOption(@Body() dto: CreateCatalogOptionDto) {
    return this.admin.createVehicleTypeOption(dto);
  }

  @Patch('vehicle-type-options/:id')
  async updateVehicleTypeOption(@Param('id') id: string, @Body() dto: UpdateCatalogOptionDto) {
    return this.admin.updateVehicleTypeOption(id, dto);
  }

  @Delete('vehicle-type-options/:id')
  async deleteVehicleTypeOption(@Param('id') id: string) {
    return this.admin.deleteVehicleTypeOption(id);
  }
}

