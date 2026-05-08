import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CheckVehicleAvailabilityDto {
  @IsUUID()
  vehicleId!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsUUID()
  excludeBookingId?: string;
}
