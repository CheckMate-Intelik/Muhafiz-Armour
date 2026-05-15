import { VehicleStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  armourLevel?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  carModel?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  generation?: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  numberPlate?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  baseRatePerHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  seatingCapacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}
