import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { AdminBookingReassignDto } from './dto/admin-booking-reassign.dto';
import { AdminBookingReviewDto } from './dto/admin-booking-review.dto';
import { AdminExtendDeadlineDto } from './dto/admin-extend-deadline.dto';
import { AdminReasonDto } from './dto/admin-reason.dto';
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

  @Get('operations-queue')
  async operationsQueue() {
    return this.admin.operationsQueue();
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.admin.globalSearch(q ?? '');
  }

  @Get('audit/admin')
  async listAdminAudit(@Query() query: Record<string, string>) {
    return this.admin.listAdminAuditLogs(query);
  }

  @Get('audit/auth')
  async listAuthAudit(@Query() query: Record<string, string>) {
    return this.admin.listAuthAuditLogs(query);
  }

  @Get('audit/bookings/:bookingId')
  async listBookingAudit(@Param('bookingId') bookingId: string) {
    return this.admin.listBookingAuditLogs(bookingId);
  }

  @Get('bookings/lookup')
  async lookupBooking(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getBooking(id.trim());
  }

  @Get('bookings')
  async listBookings(@Query() query: Record<string, string>) {
    return this.admin.listBookings(query);
  }

  @Post('bookings/:id/force-cancel')
  async forceCancelBooking(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminReasonDto) {
    return this.admin.forceCancelBooking(admin.sub, id, dto.reason);
  }

  @Post('bookings/:id/reassign')
  async reassignBooking(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminBookingReassignDto) {
    return this.admin.reassignBooking(admin.sub, id, dto.vehicleId, dto.reason);
  }

  @Post('bookings/:id/extend-deadline')
  async extendDispatcherDeadline(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminExtendDeadlineDto) {
    return this.admin.extendDispatcherDeadline(admin.sub, id, dto.reason, dto.extraMinutes ?? 60);
  }

  @Patch('bookings/:id/review')
  async setBookingReview(@AuthUser() admin: JwtPayload, @Param('id') id: string, @Body() dto: AdminBookingReviewDto) {
    return this.admin.setBookingReview(admin.sub, id, dto.isUnderReview, dto.reason, dto.note);
  }

  @Get('dispatchers/lookup')
  async lookupDispatcher(@Query('id') id: string) {
    if (!id?.trim()) throw new BadRequestException('Missing id');
    return this.admin.getDispatcher(id.trim());
  }

  @Get('dispatchers')
  async listDispatchers(@Query() query: Record<string, string>) {
    return this.admin.listDispatchers(query);
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
  async listVehicles(@Query() query: Record<string, string>) {
    return this.admin.listVehicles(query);
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
