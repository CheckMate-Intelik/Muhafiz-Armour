import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminActionType, BookingAuditAction, BookingStatus, Prisma, VehicleStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { bufferMinutesForTrip } from '../../common/trip-planning';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DISPATCHER_ACCEPT_TIMEOUT_MS,
  getPendingDispatcherExpiresAt,
  withPendingExpiryFields,
} from '../booking/booking-pending-expiry.util';
import { MatchingService } from '../matching/matching.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { resolveAssignedIdsFromAudit, resolveClosureSummary } from './admin-booking-history.util';

const EXPIRING_SOON_MS = 15 * 60 * 1000;
const RECENT_ACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminListBookingsQuery = {
  status?: string;
  startDate?: string;
  endDate?: string;
  pickupCity?: string;
  dropCity?: string;
  dispatcherId?: string;
  armourLevel?: string;
  isUnderReview?: string;
  q?: string;
};

export type AdminListDispatchersQuery = {
  isApproved?: string;
  isBlocked?: string;
  q?: string;
};

export type AdminListVehiclesQuery = {
  isApproved?: string;
  city?: string;
  q?: string;
};

export type AdminAuditQuery = {
  eventType?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: string;
  offset?: string;
  suspiciousOnly?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly matching: MatchingService,
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

  async listBookings(query: AdminListBookingsQuery = {}) {
    const where = this.buildBookingWhere(query);
    const rows = await this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true, dispatcher: true, vehicle: true },
    });
    return rows.map((row) => withPendingExpiryFields(row));
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
    const auditLogs = await this.prisma.bookingAuditLog.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'asc' },
    });

    const { dispatcher, vehicle, partiesFromHistory } = await this.enrichBookingParties(booking, auditLogs);
    const closureSummary = resolveClosureSummary(
      auditLogs.map((log) => ({
        action: log.action,
        actorRole: log.actorRole,
        actorId: log.actorId,
        details: log.details as Record<string, unknown> | null,
        createdAt: log.createdAt,
      })),
    );

    return {
      ...withPendingExpiryFields(booking),
      dispatcher,
      vehicle,
      partiesFromHistory,
      auditLogs,
      closureSummary,
    };
  }

  private async enrichBookingParties(
    booking: {
      dispatcher: unknown;
      vehicle: unknown;
      vehicleId: string | null;
      dispatcherId: string | null;
    },
    auditLogs: Array<{ action: string; actorRole: string; actorId?: string | null; details?: unknown; createdAt: Date }>,
  ) {
    const hasDispatcher = Boolean(booking.dispatcher);
    const hasVehicle = Boolean(booking.vehicle);
    if (hasDispatcher && hasVehicle) {
      return { ...booking, partiesFromHistory: false };
    }

    const fromAudit = resolveAssignedIdsFromAudit(
      auditLogs.map((log) => ({
        ...log,
        details: log.details as Record<string, unknown> | null | undefined,
      })),
    );

    const vehicleId = booking.vehicleId ?? fromAudit.vehicleId;
    let dispatcherId = booking.dispatcherId ?? fromAudit.dispatcherId;

    let vehicle: unknown = booking.vehicle;
    if (!vehicle && vehicleId) {
      vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!dispatcherId && vehicle && typeof vehicle === 'object' && 'dispatcherId' in vehicle && typeof vehicle.dispatcherId === 'string') {
        dispatcherId = vehicle.dispatcherId;
      }
    }

    let dispatcher: unknown = booking.dispatcher;
    if (!dispatcher && dispatcherId) {
      dispatcher = await this.prisma.dispatcher.findUnique({
        where: { id: dispatcherId },
        select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true },
      });
    }
    if (!dispatcher && vehicle && typeof vehicle === 'object' && 'dispatcherId' in vehicle && typeof vehicle.dispatcherId === 'string') {
      dispatcher = await this.prisma.dispatcher.findUnique({
        where: { id: vehicle.dispatcherId },
        select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true },
      });
    }

    const partiesFromHistory = !(hasDispatcher && hasVehicle) && !!(dispatcher || vehicle);

    return { dispatcher, vehicle, partiesFromHistory };
  }

  async listDispatchers(query: AdminListDispatchersQuery = {}) {
    const where = this.buildDispatcherWhere(query);
    return this.prisma.dispatcher.findMany({
      where,
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

  async listVehicles(query: AdminListVehiclesQuery = {}) {
    const where = this.buildVehicleWhere(query);
    return this.prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { dispatcher: true },
    });
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

  async operationsQueue() {
    const now = new Date();
    const recentCutoff = new Date(now.getTime() - RECENT_ACTIVITY_MS);

    const [
      pendingDispatchers,
      pendingVehicles,
      pendingDispatcherBookings,
      pendingExtensions,
      blockedUsers,
      blockedDispatchers,
    ] = await Promise.all([
      this.prisma.dispatcher.findMany({
        where: { isApproved: false, isBlocked: false },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
      this.prisma.vehicle.findMany({
        where: { isApproved: false },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: { dispatcher: { select: { id: true, name: true } } },
      }),
      this.prisma.booking.findMany({
        where: { status: 'PENDING_DISPATCHER' },
        orderBy: { pendingDispatcherAt: 'asc' },
        take: 50,
        include: { user: { select: { id: true, name: true, phone: true } }, dispatcher: { select: { id: true, name: true } }, vehicle: { select: { id: true, armourLevel: true, vehicleType: true, numberPlate: true } } },
      }),
      this.prisma.bookingExtensionRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 20,
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true } },
              dispatcher: { select: { id: true, name: true } },
              vehicle: { select: { id: true, armourLevel: true, numberPlate: true } },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          isBlocked: true,
          bookings: {
            some: {
              OR: [
                { createdAt: { gte: recentCutoff } },
                { status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING_DISPATCHER'] } },
              ],
            },
          },
        },
        take: 20,
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
      this.prisma.dispatcher.findMany({
        where: {
          isBlocked: true,
          bookings: {
            some: {
              OR: [
                { createdAt: { gte: recentCutoff } },
                { status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING_DISPATCHER'] } },
              ],
            },
          },
        },
        take: 20,
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
    ]);

    const expiringBookings = pendingDispatcherBookings
      .map((b) => {
        const expiresAt = getPendingDispatcherExpiresAt(b);
        const msLeft = expiresAt ? expiresAt.getTime() - now.getTime() : null;
        return { ...withPendingExpiryFields(b), msUntilExpiry: msLeft };
      })
      .filter((b) => b.msUntilExpiry != null && b.msUntilExpiry <= EXPIRING_SOON_MS)
      .sort((a, b) => (a.msUntilExpiry ?? 0) - (b.msUntilExpiry ?? 0));

    return {
      pendingDispatchers,
      pendingVehicles,
      expiringBookings,
      pendingExtensions,
      blockedUsersWithActivity: blockedUsers,
      blockedDispatchersWithActivity: blockedDispatchers,
      counts: {
        pendingDispatchers: pendingDispatchers.length,
        pendingVehicles: pendingVehicles.length,
        expiringBookings: expiringBookings.length,
        pendingExtensions: pendingExtensions.length,
        blockedUsersWithActivity: blockedUsers.length,
        blockedDispatchersWithActivity: blockedDispatchers.length,
      },
    };
  }

  async listAdminAuditLogs(query: AdminAuditQuery) {
    const { take, skip } = this.parsePagination(query);
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.eventType ? { actionType: query.eventType as AdminActionType } : {}),
      ...this.dateRangeWhere(query.from, query.to),
    };
    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { admin: { select: { id: true, username: true, displayName: true } } },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { rows, total, take, skip };
  }

  async listAuthAuditLogs(query: AdminAuditQuery) {
    const { take, skip } = this.parsePagination(query);
    const suspiciousTypes = ['LOGIN_FAILURE', 'SIGNUP_FAILURE', 'PASSWORD_RESET_FAILURE'] as const;
    const where: Prisma.AuthAuditLogWhereInput = {
      ...(query.suspiciousOnly === 'true' ? { eventType: { in: [...suspiciousTypes] } } : {}),
      ...(query.eventType && query.suspiciousOnly !== 'true' ? { eventType: query.eventType as any } : {}),
      ...this.dateRangeWhere(query.from, query.to),
      ...(query.q?.trim()
        ? {
            OR: [
              { email: { contains: query.q.trim(), mode: 'insensitive' } },
              { username: { contains: query.q.trim(), mode: 'insensitive' } },
              { message: { contains: query.q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.authAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.authAuditLog.count({ where }),
    ]);
    return { rows, total, take, skip };
  }

  async listBookingAuditLogs(bookingId: string) {
    await this.requireBooking(bookingId);
    return this.prisma.bookingAuditLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async globalSearch(q: string) {
    const term = q.trim();
    if (!term) return { bookings: [], users: [], dispatchers: [], vehicles: [] };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
    const phoneLike = term.replace(/\s/g, '');

    const [bookings, users, dispatchers, vehicles] = await Promise.all([
      this.prisma.booking.findMany({
        where: isUuid ? { id: term } : {
          OR: [
            { pickupLocation: { contains: term, mode: 'insensitive' } },
            { dropLocation: { contains: term, mode: 'insensitive' } },
            { pickupCity: { contains: term, mode: 'insensitive' } },
            { dropCity: { contains: term, mode: 'insensitive' } },
            { user: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: phoneLike } }, { email: { contains: term, mode: 'insensitive' } }] } },
            { dispatcher: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: phoneLike } }] } },
            { vehicle: { OR: [{ numberPlate: { contains: term, mode: 'insensitive' } }, { registrationNumber: { contains: term, mode: 'insensitive' } }] } },
          ],
        },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { user: true, dispatcher: true, vehicle: true },
      }),
      this.prisma.user.findMany({
        where: isUuid
          ? { id: term }
          : {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: phoneLike } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            },
        take: 10,
        select: { id: true, name: true, phone: true, email: true, isBlocked: true },
      }),
      this.prisma.dispatcher.findMany({
        where: isUuid
          ? { id: term }
          : {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: phoneLike } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            },
        take: 10,
        select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true },
      }),
      this.prisma.vehicle.findMany({
        where: isUuid
          ? { id: term }
          : {
              OR: [
                { numberPlate: { contains: term, mode: 'insensitive' } },
                { registrationNumber: { contains: term, mode: 'insensitive' } },
                { carModel: { contains: term, mode: 'insensitive' } },
                { manufacturer: { contains: term, mode: 'insensitive' } },
                { location: { contains: term, mode: 'insensitive' } },
              ],
            },
        take: 10,
        include: { dispatcher: { select: { id: true, name: true } } },
      }),
    ]);

    return { bookings: bookings.map((b) => withPendingExpiryFields(b)), users, dispatchers, vehicles };
  }

  async forceCancelBooking(adminId: string, bookingId: string, reason: string) {
    const booking = await this.requireBooking(bookingId);
    if (!['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be force-cancelled in its current status');
    }

    const previousStatus = booking.status;
    const vid = booking.vehicleId;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REJECTED',
          actualEndTime: booking.actualEndTime ?? (booking.status === 'IN_PROGRESS' ? new Date() : booking.actualEndTime),
        },
        include: { user: true, dispatcher: true, vehicle: true, extensionRequests: { orderBy: { createdAt: 'asc' } } },
      });
      if (vid) {
        await tx.vehicle.updateMany({ where: { id: vid, status: 'BOOKED' }, data: { status: 'AVAILABLE' } });
      }
      return row;
    });

    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.FORCE_CANCEL_BOOKING,
      targetType: 'booking',
      targetId: bookingId,
      details: { reason, previousStatus },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'ADMIN',
      actorId: adminId,
      action: BookingAuditAction.ADMIN_FORCE_CANCELLED,
      fromStatus: previousStatus as BookingStatus,
      toStatus: BookingStatus.REJECTED,
      details: {
        reason,
        vehicleId: booking.vehicleId ?? undefined,
        dispatcherId: booking.dispatcherId ?? undefined,
      },
    });
    return withPendingExpiryFields(updated);
  }

  async reassignBooking(adminId: string, bookingId: string, vehicleId: string, reason: string) {
    const booking = await this.requireBooking(bookingId);
    if (!['PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestException('Booking cannot be reassigned in its current status');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { dispatcher: true } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');
    if (!vehicle.isApproved) throw new BadRequestException('Vehicle not approved');
    if (vehicle.dispatcher.isBlocked) throw new BadRequestException('Dispatcher is blocked');
    if (process.env.NODE_ENV === 'production' && !vehicle.dispatcher.isApproved) {
      throw new BadRequestException('Dispatcher not approved');
    }

    const buf = booking.bufferMinutes ?? bufferMinutesForTrip(booking.pickupCity, booking.dropCity);
    const free = await this.matching.assertVehicleAvailableForWindow(
      vehicleId,
      booking.startTime,
      booking.endTime,
      buf,
      booking.id,
    );
    if (!free) throw new BadRequestException('Vehicle is not available for this time range');

    const previousVehicleId = booking.vehicleId;
    const previousDispatcherId = booking.dispatcherId;
    const durationHours = (booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60 * 60);
    const plannedPrice = Math.round(vehicle.baseRatePerHour * durationHours);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (previousVehicleId && previousVehicleId !== vehicleId) {
        await tx.vehicle.updateMany({
          where: { id: previousVehicleId, status: 'BOOKED' },
          data: { status: 'AVAILABLE' },
        });
      }
      const row = await tx.booking.update({
        where: { id: bookingId },
        data: {
          vehicleId: vehicle.id,
          dispatcherId: vehicle.dispatcherId,
          totalPrice: plannedPrice,
          ...(booking.status === 'PENDING_DISPATCHER' ? { pendingDispatcherAt: new Date() } : {}),
        },
        include: { user: true, dispatcher: true, vehicle: true, extensionRequests: { orderBy: { createdAt: 'asc' } } },
      });
      await tx.vehicle.update({ where: { id: vehicle.id }, data: { status: 'BOOKED' } });
      return row;
    });

    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.REASSIGN_BOOKING,
      targetType: 'booking',
      targetId: bookingId,
      details: { reason, previousVehicleId, previousDispatcherId, vehicleId, dispatcherId: vehicle.dispatcherId },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'ADMIN',
      actorId: adminId,
      action: BookingAuditAction.ADMIN_REASSIGNED,
      fromStatus: booking.status as BookingStatus,
      toStatus: booking.status as BookingStatus,
      details: { reason, previousVehicleId, previousDispatcherId, vehicleId, dispatcherId: vehicle.dispatcherId },
    });
    return withPendingExpiryFields(updated);
  }

  async extendDispatcherDeadline(adminId: string, bookingId: string, reason: string, extraMinutes = 60) {
    const booking = await this.requireBooking(bookingId);
    if (booking.status !== 'PENDING_DISPATCHER') {
      throw new BadRequestException('Only pending dispatcher bookings can have their deadline extended');
    }

    const now = new Date();
    const pendingDispatcherAt = new Date(now.getTime() - DISPATCHER_ACCEPT_TIMEOUT_MS + extraMinutes * 60 * 1000);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { pendingDispatcherAt },
      include: { user: true, dispatcher: true, vehicle: true, extensionRequests: { orderBy: { createdAt: 'asc' } } },
    });

    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.EXTEND_DISPATCHER_DEADLINE,
      targetType: 'booking',
      targetId: bookingId,
      details: { reason, extraMinutes, pendingDispatcherAt: pendingDispatcherAt.toISOString() },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'ADMIN',
      actorId: adminId,
      action: BookingAuditAction.ADMIN_EXTENDED_DEADLINE,
      fromStatus: BookingStatus.PENDING_DISPATCHER,
      toStatus: BookingStatus.PENDING_DISPATCHER,
      details: { reason, extraMinutes },
    });
    return withPendingExpiryFields(updated);
  }

  async setBookingReview(adminId: string, bookingId: string, isUnderReview: boolean, reason: string, note?: string) {
    await this.requireBooking(bookingId);
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        isUnderReview,
        adminReviewNote: isUnderReview ? (note?.trim() || null) : null,
      },
      include: { user: true, dispatcher: true, vehicle: true, extensionRequests: { orderBy: { createdAt: 'asc' } } },
    });

    await this.audit.logAdminAction({
      adminId,
      actionType: AdminActionType.SET_BOOKING_REVIEW,
      targetType: 'booking',
      targetId: bookingId,
      details: { reason, isUnderReview, note: note?.trim() || null },
    });
    await this.audit.logBookingAction({
      bookingId,
      actorRole: 'ADMIN',
      actorId: adminId,
      action: isUnderReview ? BookingAuditAction.ADMIN_MARKED_REVIEW : BookingAuditAction.ADMIN_UNMARKED_REVIEW,
      fromStatus: updated.status,
      toStatus: updated.status,
      details: { reason, note: note?.trim() || null },
    });
    return withPendingExpiryFields(updated);
  }

  private buildBookingWhere(query: AdminListBookingsQuery): Prisma.BookingWhereInput {
    const and: Prisma.BookingWhereInput[] = [];
    if (query.status?.trim()) and.push({ status: query.status.trim() as BookingStatus });
    if (query.pickupCity?.trim()) and.push({ pickupCity: { contains: query.pickupCity.trim(), mode: 'insensitive' } });
    if (query.dropCity?.trim()) and.push({ dropCity: { contains: query.dropCity.trim(), mode: 'insensitive' } });
    if (query.dispatcherId?.trim()) and.push({ dispatcherId: query.dispatcherId.trim() });
    if (query.armourLevel?.trim()) and.push({ vehicle: { armourLevel: query.armourLevel.trim() } });
    if (query.isUnderReview === 'true') and.push({ isUnderReview: true });
    if (query.isUnderReview === 'false') and.push({ isUnderReview: false });
    const start = query.startDate ? new Date(query.startDate) : null;
    const end = query.endDate ? new Date(query.endDate) : null;
    if (start && !Number.isNaN(start.getTime())) and.push({ startTime: { gte: start } });
    if (end && !Number.isNaN(end.getTime())) and.push({ startTime: { lte: end } });
    if (query.q?.trim()) {
      const term = query.q.trim();
      const phoneLike = term.replace(/\s/g, '');
      and.push({
        OR: [
          { id: term },
          { pickupCity: { contains: term, mode: 'insensitive' } },
          { dropCity: { contains: term, mode: 'insensitive' } },
          { user: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: phoneLike } }, { email: { contains: term, mode: 'insensitive' } }] } },
          { dispatcher: { OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: phoneLike } }] } },
          { vehicle: { OR: [{ numberPlate: { contains: term, mode: 'insensitive' } }, { registrationNumber: { contains: term, mode: 'insensitive' } }] } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private buildDispatcherWhere(query: AdminListDispatchersQuery): Prisma.DispatcherWhereInput {
    const and: Prisma.DispatcherWhereInput[] = [];
    if (query.isApproved === 'true') and.push({ isApproved: true });
    if (query.isApproved === 'false') and.push({ isApproved: false });
    if (query.isBlocked === 'true') and.push({ isBlocked: true });
    if (query.isBlocked === 'false') and.push({ isBlocked: false });
    if (query.q?.trim()) {
      const term = query.q.trim();
      const phoneLike = term.replace(/\s/g, '');
      and.push({
        OR: [
          { id: term },
          { name: { contains: term, mode: 'insensitive' } },
          { phone: { contains: phoneLike } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private buildVehicleWhere(query: AdminListVehiclesQuery): Prisma.VehicleWhereInput {
    const and: Prisma.VehicleWhereInput[] = [];
    if (query.isApproved === 'true') and.push({ isApproved: true });
    if (query.isApproved === 'false') and.push({ isApproved: false });
    if (query.city?.trim()) and.push({ location: { contains: query.city.trim(), mode: 'insensitive' } });
    if (query.q?.trim()) {
      const term = query.q.trim();
      and.push({
        OR: [
          { id: term },
          { numberPlate: { contains: term, mode: 'insensitive' } },
          { registrationNumber: { contains: term, mode: 'insensitive' } },
          { carModel: { contains: term, mode: 'insensitive' } },
          { manufacturer: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
          { dispatcher: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private parsePagination(query: AdminAuditQuery) {
    const take = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = Math.max(0, Number(query.offset) || 0);
    return { take, skip };
  }

  private dateRangeWhere(from?: string, to?: string): { createdAt?: { gte?: Date; lte?: Date } } {
    const range: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) range.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) range.lte = d;
    }
    return Object.keys(range).length ? { createdAt: range } : {};
  }

  private async requireBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}

