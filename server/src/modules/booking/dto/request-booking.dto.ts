import { IsDateString, IsString } from 'class-validator';

export class RequestBookingDto {
  @IsString()
  pickupLocation!: string;

  @IsString()
  dropLocation!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}

