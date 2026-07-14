import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminBookingReassignDto {
  @IsUUID()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
