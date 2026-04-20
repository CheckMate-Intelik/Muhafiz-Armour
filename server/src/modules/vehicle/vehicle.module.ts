import { Module } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehiclePublicController } from './vehicle.public.controller';
import { VehicleService } from './vehicle.service';

@Module({
  controllers: [VehicleController, VehiclePublicController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}

