import { BadRequestException, Injectable } from '@nestjs/common';
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

    return this.prisma.vehicle.create({
      data: {
        driverId,
        type: dto.type,
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
}

