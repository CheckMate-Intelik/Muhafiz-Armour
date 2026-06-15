import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminActionType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async metrics() {
    const [
      users,
      blockedUsers,
      dispatchers,
      approvedDispatchers,
      blockedDispatchers,
      vehicles,
      approvedVehicles,
      pendingVehicles,
      bookings,
      completedBookings,
      activeBookings,
      pendingDispatcherBookings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.dispatcher.count(),
      this.prisma.dispatcher.count({ where: { isApproved: true } }),
      this.prisma.dispatcher.count({ where: { isBlocked: true } }),
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where: { isApproved: true } }),
      this.prisma.vehicle.count({ where: { isApproved: false } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
      this.prisma.booking.count({ where: { status: 'PENDING_DISPATCHER' } }),
    ]);

    return {
      users: { total: users, blocked: blockedUsers },
      dispatchers: { total: dispatchers, approved: approvedDispatchers, blocked: blockedDispatchers },
      vehicles: { total: vehicles, approved: approvedVehicles, pending: pendingVehicles },
      bookings: {
        total: bookings,
        completed: completedBookings,
        active: activeBookings,
        pendingDispatcher: pendingDispatcherBookings,
      },
    };
  }

  async listBookings() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true, dispatcher: true, vehicle: true },
    });
  }

  async getBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, isBlocked: true, createdAt: true } },
        dispatcher: { select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true } },
        vehicle: true,
        extensionRequests: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async listDispatchers() {
    return this.prisma.dispatcher.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async getDispatcher(id: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
        vehicles: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            armourLevel: true,
            vehicleType: true,
            manufacturer: true,
            generation: true,
            carModel: true,
            year: true,
            location: true,
            baseRatePerHour: true,
            isApproved: true,
            numberPlate: true,
            registrationNumber: true,
            createdAt: true,
          },
        },
      },
    });
    if (!dispatcher) throw new NotFoundException('Dispatcher not found');
    return dispatcher;
  }

  async setDispatcherApproval(adminId: string, dispatcherId: string, isApproved: boolean) {
    await this.requireDispatcher(dispatcherId);
    const updated = await this.prisma.dispatcher.update({ where: { id: dispatcherId }, data: { isApproved } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.APPROVE_DISPATCHER,
      targetType: 'dispatcher',
      targetId: dispatcherId,
      details: { isApproved },
    });
    return updated;
  }

  async setDispatcherBlock(adminId: string, dispatcherId: string, isBlocked: boolean) {
    await this.requireDispatcher(dispatcherId);
    const updated = await this.prisma.dispatcher.update({ where: { id: dispatcherId }, data: { isBlocked } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.BLOCK_DISPATCHER,
      targetType: 'dispatcher',
      targetId: dispatcherId,
      details: { isBlocked },
    });
    return updated;
  }

  async listVehicles() {
    return this.prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' }, include: { dispatcher: true } });
  }

  async getVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        dispatcher: { select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true } },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalPrice: true,
            pickupLocation: true,
            dropLocation: true,
            createdAt: true,
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async setVehicleApproval(adminId: string, vehicleId: string, isApproved: boolean) {
    await this.requireVehicle(vehicleId);
    const updated = await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { isApproved } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.APPROVE_VEHICLE,
      targetType: 'vehicle',
      targetId: vehicleId,
      details: { isApproved },
    });
    return updated;
  }

  async updateVehicle(adminId: string, vehicleId: string, dto: UpdateVehicleDto) {
    await this.requireVehicle(vehicleId);
    const data = await this.buildVehicleUpdateData(dto);
    if (Object.keys(data).length > 0) {
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data });
      await this.audit.logAdminAction({
        adminId,
        actionType: AdminActionType.UPDATE_VEHICLE,
        targetType: 'vehicle',
        targetId: vehicleId,
        details: data,
      });
    }
    return this.getVehicle(vehicleId);
  }

  private async buildVehicleUpdateData(dto: UpdateVehicleDto) {
    const data: Record<string, unknown> = {};

    if (dto.armourLevel !== undefined) {
      const code = dto.armourLevel.trim();
      await this.assertActiveArmourLevel(code);
      data.armourLevel = code;
    }
    if (dto.vehicleType !== undefined) {
      const code = dto.vehicleType.trim();
      await this.assertActiveVehicleType(code);
      data.vehicleType = code;
    }
    if (dto.carModel !== undefined) data.carModel = dto.carModel.trim() || null;
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer.trim() || null;
    if (dto.generation !== undefined) data.generation = dto.generation.trim() || null;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.color !== undefined) data.color = dto.color.trim() || null;
    if (dto.numberPlate !== undefined) data.numberPlate = dto.numberPlate.trim() || null;
    if (dto.registrationNumber !== undefined) data.registrationNumber = dto.registrationNumber.trim() || null;
    if (dto.imageUrls !== undefined) {
      data.imageUrls = dto.imageUrls
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => /^https:\/\//i.test(u));
    }
    if (dto.baseRatePerHour !== undefined) data.baseRatePerHour = dto.baseRatePerHour;
    if (dto.seatingCapacity !== undefined) data.seatingCapacity = Math.round(Number(dto.seatingCapacity));
    if (dto.location !== undefined) {
      const loc = dto.location.trim();
      if (!loc) throw new BadRequestException('Location is required');
      data.location = loc;
    }
    if (dto.status !== undefined) data.status = dto.status as VehicleStatus;
    if (dto.isApproved !== undefined) data.isApproved = dto.isApproved;

    return data;
  }

  private async assertActiveArmourLevel(code: string) {
    const row = await this.prisma.armourLevelOption.findFirst({
      where: { code, isActive: true },
    });
    if (!row) throw new BadRequestException('Invalid armour level');
  }

  private async assertActiveVehicleType(code: string) {
    const row = await this.prisma.vehicleTypeOption.findFirst({
      where: { code, isActive: true },
    });
    if (!row) throw new BadRequestException('Invalid vehicle type');
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isBlocked: true,
        createdAt: true,
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalPrice: true,
            pickupLocation: true,
            dropLocation: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listArmourLevelOptions() {
    return this.prisma.armourLevelOption.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async listVehicleTypeOptions() {
    return this.prisma.vehicleTypeOption.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async updateArmourLevelOption(adminId: string, id: string, dto: UpdateCatalogOptionDto) {
    await this.requireArmourLevelOption(id);
    if (dto.label === undefined && dto.sortOrder === undefined && dto.isActive === undefined) {
      throw new BadRequestException('No fields to update');
    }
    const updated = await this.prisma.armourLevelOption.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.UPDATE_CATALOG_OPTION,
      targetType: 'armour_level_option',
      targetId: id,
      details: { ...dto },
    });
    return updated;
  }

  async updateVehicleTypeOption(adminId: string, id: string, dto: UpdateCatalogOptionDto) {
    await this.requireVehicleTypeOption(id);
    if (dto.label === undefined && dto.sortOrder === undefined && dto.isActive === undefined) {
      throw new BadRequestException('No fields to update');
    }
    const updated = await this.prisma.vehicleTypeOption.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.UPDATE_CATALOG_OPTION,
      targetType: 'vehicle_type_option',
      targetId: id,
      details: { ...dto },
    });
    return updated;
  }

  async createArmourLevelOption(adminId: string, dto: CreateCatalogOptionDto) {
    const code = dto.code.trim().toUpperCase();
    const label = dto.label.trim();
    try {
      const created = await this.prisma.armourLevelOption.create({
        data: {
          code,
          label,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      await this.audit.logAdminAction({
        adminId,
        actionType: AdminActionType.CREATE_CATALOG_OPTION,
        targetType: 'armour_level_option',
        targetId: created.id,
        details: { code, label },
      });
      return created;
    } catch (e: unknown) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This code is already in use');
      }
      throw e;
    }
  }

  async createVehicleTypeOption(adminId: string, dto: CreateCatalogOptionDto) {
    const code = dto.code.trim().toUpperCase();
    const label = dto.label.trim();
    try {
      const created = await this.prisma.vehicleTypeOption.create({
        data: {
          code,
          label,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      await this.audit.logAdminAction({
        adminId,
        actionType: AdminActionType.CREATE_CATALOG_OPTION,
        targetType: 'vehicle_type_option',
        targetId: created.id,
        details: { code, label },
      });
      return created;
    } catch (e: unknown) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This code is already in use');
      }
      throw e;
    }
  }

  async deleteArmourLevelOption(adminId: string, id: string) {
    const row = await this.requireArmourLevelOption(id);
    const inUse = await this.prisma.vehicle.count({ where: { armourLevel: row.code } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot remove: ${inUse} vehicle(s) still use armour level "${row.code}". Update those vehicles first, or turn off "Active" instead of deleting.`,
      );
    }
    await this.prisma.armourLevelOption.delete({ where: { id } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.DELETE_CATALOG_OPTION,
      targetType: 'armour_level_option',
      targetId: id,
      details: { code: row.code },
    });
    return { ok: true as const, id: row.id, code: row.code };
  }

  async deleteVehicleTypeOption(adminId: string, id: string) {
    const row = await this.requireVehicleTypeOption(id);
    const inUse = await this.prisma.vehicle.count({ where: { vehicleType: row.code } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot remove: ${inUse} vehicle(s) still use type "${row.code}". Update those vehicles first, or turn off "Active" instead of deleting.`,
      );
    }
    await this.prisma.vehicleTypeOption.delete({ where: { id } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.DELETE_CATALOG_OPTION,
      targetType: 'vehicle_type_option',
      targetId: id,
      details: { code: row.code },
    });
    return { ok: true as const, id: row.id, code: row.code };
  }

  async setUserBlock(adminId: string, userId: string, isBlocked: boolean) {
    await this.requireUser(userId);
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { isBlocked } });
    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.BLOCK_USER,
      targetType: 'user',
      targetId: userId,
      details: { isBlocked },
    });
    return updated;
  }

  private async requireDispatcher(id: string) {
    const dispatcher = await this.prisma.dispatcher.findUnique({ where: { id } });
    if (!dispatcher) throw new NotFoundException('Dispatcher not found');
    return dispatcher;
  }

  private async requireVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async requireArmourLevelOption(id: string) {
    const row = await this.prisma.armourLevelOption.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Armour level option not found');
    return row;
  }

  private async requireVehicleTypeOption(id: string) {
    const row = await this.prisma.vehicleTypeOption.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vehicle type option not found');
    return row;
  }
}

