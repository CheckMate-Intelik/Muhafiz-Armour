import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { VehicleController } from './vehicle.controller';
import { VehiclePublicController } from './vehicle.public.controller';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [MatchingModule],
  controllers: [VehicleController, VehiclePublicController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}

