import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const [
      users,
      blockedUsers,
      drivers,
      approvedDrivers,
      blockedDrivers,
      vehicles,
      approvedVehicles,
      pendingVehicles,
      bookings,
      completedBookings,
      activeBookings,
      pendingDriverBookings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { isApproved: true } }),
      this.prisma.driver.count({ where: { isBlocked: true } }),
      this.prisma.vehicle.count(),
      this.prisma.vehicle.count({ where: { isApproved: true } }),
      this.prisma.vehicle.count({ where: { isApproved: false } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } } }),
      this.prisma.booking.count({ where: { status: 'PENDING_DRIVER' } }),
    ]);

    return {
      users: { total: users, blocked: blockedUsers },
      drivers: { total: drivers, approved: approvedDrivers, blocked: blockedDrivers },
      vehicles: { total: vehicles, approved: approvedVehicles, pending: pendingVehicles },
      bookings: {
        total: bookings,
        completed: completedBookings,
        active: activeBookings,
        pendingDriver: pendingDriverBookings,
      },
    };
  }

  async listBookings() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true, driver: true, vehicle: true },
    });
  }

  async getBooking(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, isBlocked: true, createdAt: true } },
        driver: { select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true } },
        vehicle: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async listDrivers() {
    return this.prisma.driver.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getDriver(id: string) {
    const driver = await this.prisma.driver.findUnique({
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
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async setDriverApproval(driverId: string, isApproved: boolean) {
    await this.requireDriver(driverId);
    return this.prisma.driver.update({ where: { id: driverId }, data: { isApproved } });
  }

  async setDriverBlock(driverId: string, isBlocked: boolean) {
    await this.requireDriver(driverId);
    return this.prisma.driver.update({ where: { id: driverId }, data: { isBlocked } });
  }

  async listVehicles() {
    return this.prisma.vehicle.findMany({ orderBy: { createdAt: 'desc' }, include: { driver: true } });
  }

  async getVehicle(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, name: true, phone: true, email: true, isApproved: true, isBlocked: true, createdAt: true } },
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

  async setVehicleApproval(vehicleId: string, isApproved: boolean) {
    await this.requireVehicle(vehicleId);
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: { isApproved } });
  }

  async listUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
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

  async updateArmourLevelOption(id: string, dto: UpdateCatalogOptionDto) {
    await this.requireArmourLevelOption(id);
    if (dto.label === undefined && dto.sortOrder === undefined && dto.isActive === undefined) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.armourLevelOption.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async updateVehicleTypeOption(id: string, dto: UpdateCatalogOptionDto) {
    await this.requireVehicleTypeOption(id);
    if (dto.label === undefined && dto.sortOrder === undefined && dto.isActive === undefined) {
      throw new BadRequestException('No fields to update');
    }
    return this.prisma.vehicleTypeOption.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async createArmourLevelOption(dto: CreateCatalogOptionDto) {
    const code = dto.code.trim().toUpperCase();
    const label = dto.label.trim();
    try {
      return await this.prisma.armourLevelOption.create({
        data: {
          code,
          label,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This code is already in use');
      }
      throw e;
    }
  }

  async createVehicleTypeOption(dto: CreateCatalogOptionDto) {
    const code = dto.code.trim().toUpperCase();
    const label = dto.label.trim();
    try {
      return await this.prisma.vehicleTypeOption.create({
        data: {
          code,
          label,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('This code is already in use');
      }
      throw e;
    }
  }

  async deleteArmourLevelOption(id: string) {
    const row = await this.requireArmourLevelOption(id);
    const inUse = await this.prisma.vehicle.count({ where: { armourLevel: row.code } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot remove: ${inUse} vehicle(s) still use armour level "${row.code}". Update those vehicles first, or turn off "Active" instead of deleting.`,
      );
    }
    await this.prisma.armourLevelOption.delete({ where: { id } });
    return { ok: true as const, id: row.id, code: row.code };
  }

  async deleteVehicleTypeOption(id: string) {
    const row = await this.requireVehicleTypeOption(id);
    const inUse = await this.prisma.vehicle.count({ where: { vehicleType: row.code } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot remove: ${inUse} vehicle(s) still use type "${row.code}". Update those vehicles first, or turn off "Active" instead of deleting.`,
      );
    }
    await this.prisma.vehicleTypeOption.delete({ where: { id } });
    return { ok: true as const, id: row.id, code: row.code };
  }

  async setUserBlock(userId: string, isBlocked: boolean) {
    await this.requireUser(userId);
    return this.prisma.user.update({ where: { id: userId }, data: { isBlocked } });
  }

  private async requireDriver(id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
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

