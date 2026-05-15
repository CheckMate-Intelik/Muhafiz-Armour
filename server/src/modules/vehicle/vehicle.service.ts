import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  async createForDispatcher(dispatcherId: string, dto: CreateVehicleDto) {
    const dispatcher = await this.prisma.dispatcher.findUnique({ where: { id: dispatcherId } });
    if (!dispatcher) throw new BadRequestException('Dispatcher not found');
    if (dispatcher.isBlocked) throw new BadRequestException('Dispatcher is blocked');
    if (!dispatcher.isApproved && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Dispatcher not approved');
    }
    const [armourLevels, vehicleTypes] = await Promise.all([
      this.prisma.armourLevelOption.findMany({ where: { isActive: true }, select: { code: true } }),
      this.prisma.vehicleTypeOption.findMany({ where: { isActive: true }, select: { code: true } }),
    ]);
    const validArmours = new Set(armourLevels.map((x: (typeof armourLevels)[number]) => x.code));
    const validVehicleTypes = new Set(vehicleTypes.map((x: (typeof vehicleTypes)[number]) => x.code));
    if (!validArmours.has(dto.armourLevel)) throw new BadRequestException('Invalid armour level');
    if (!validVehicleTypes.has(dto.vehicleType)) throw new BadRequestException('Invalid vehicle type');

    const imageUrls = (dto.imageUrls ?? [])
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => /^https:\/\//i.test(u));

    return this.prisma.vehicle.create({
      data: {
        dispatcherId,
        armourLevel: dto.armourLevel,
        vehicleType: dto.vehicleType,
        carModel: dto.carModel.trim(),
        manufacturer: dto.manufacturer.trim(),
        generation: dto.generation.trim(),
        year: dto.year,
        color: dto.color.trim(),
        numberPlate: dto.numberPlate.trim(),
        registrationNumber: dto.registrationNumber.trim(),
        imageUrls,
        baseRatePerHour: dto.baseRatePerHour,
        seatingCapacity: dto.seatingCapacity != null ? Math.round(Number(dto.seatingCapacity)) : 4,
        location: dto.location.trim(),
        isApproved: false,
      },
    });
  }

  async listForDispatcher(dispatcherId: string) {
    return this.prisma.vehicle.findMany({
      where: { dispatcherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForDispatcherById(dispatcherId: string, vehicleId: string) {
    return this.prisma.vehicle.findFirst({
      where: { id: vehicleId, dispatcherId },
      include: {
        dispatcher: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
