import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  async listDrivers() {
    return this.prisma.driver.findMany({ orderBy: { createdAt: 'desc' } });
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

  async setVehicleApproval(vehicleId: string, isApproved: boolean) {
    await this.requireVehicle(vehicleId);
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: { isApproved } });
  }

  async listUsers() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
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
}

