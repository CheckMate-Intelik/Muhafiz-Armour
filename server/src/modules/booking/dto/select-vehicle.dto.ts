import { IsUUID } from 'class-validator';

export class SelectVehicleDto {
  @IsUUID()
  vehicleId!: string;
}

