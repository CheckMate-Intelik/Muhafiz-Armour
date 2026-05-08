import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateBookingScheduleDto {
  @IsDateString()
  endTime!: string;

  /** When provided, verifies this vehicle stays free for the new window. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
