import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestBookingDto {
  @IsString()
  pickupLocation!: string;

  @IsString()
  dropLocation!: string;

  @IsOptional()
  @IsString()
  pickupCity?: string;

  @IsOptional()
  @IsString()
  dropCity?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pickupLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pickupLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropLng?: number;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}
