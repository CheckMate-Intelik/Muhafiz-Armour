import { BadRequestException, Injectable } from '@nestjs/common';
import { ArmourLevel, VehicleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async createForDriver(driverId: string, dto: CreateVehicleDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new BadRequestException('Driver not found');
    if (driver.isBlocked) throw new BadRequestException('Driver is blocked');
    if (!driver.isApproved && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Driver not approved');
    }
    const [armourLevels, vehicleTypes] = await Promise.all([
      this.prisma.armourLevelOption.findMany({ where: { isActive: true }, select: { code: true } }),
      this.prisma.vehicleTypeOption.findMany({ where: { isActive: true }, select: { code: true } }),
    ]);
    const validArmours = new Set(armourLevels.map((x: (typeof armourLevels)[number]) => x.code));
    const validVehicleTypes = new Set(vehicleTypes.map((x: (typeof vehicleTypes)[number]) => x.code));
    if (!validArmours.has(dto.armourLevel)) throw new BadRequestException('Invalid armour level');
    if (!validVehicleTypes.has(dto.vehicleType)) throw new BadRequestException('Invalid vehicle type');

    return this.prisma.vehicle.create({
      data: {
        driverId,
        armourLevel: dto.armourLevel as ArmourLevel,
        vehicleType: dto.vehicleType as VehicleType,
        carModel: dto.carModel.trim(),
        manufacturer: dto.manufacturer.trim(),
        generation: dto.generation.trim(),
        year: dto.year,
        color: dto.color.trim(),
        numberPlate: dto.numberPlate.trim(),
        registrationNumber: dto.registrationNumber.trim(),
        imageUrls: dto.imageUrls ?? [],
        baseRatePerHour: dto.baseRatePerHour,
        location: dto.location.trim(),
        isApproved: false,
      },
    });
  }

  async listForDriver(driverId: string) {
    return this.prisma.vehicle.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForDriverById(driverId: string, vehicleId: string) {
    return this.prisma.vehicle.findFirst({
      where: { id: vehicleId, driverId },
      include: {
        driver: {
          select: { id: true, name: true },
        },
      },
    });
  }
}

