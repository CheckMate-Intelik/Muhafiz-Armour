import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateVehicleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  armourLevel!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  vehicleType!: string;

  @IsString()
  carModel!: string;

  @IsString()
  manufacturer!: string;

  @IsString()
  generation!: string;

  @IsInt()
  @Min(1980)
  @Max(2100)
  year!: number;

  @IsString()
  color!: string;

  @IsString()
  numberPlate!: string;

  @IsString()
  registrationNumber!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsInt()
  @Min(1)
  baseRatePerHour!: number;

  @IsString()
  location!: string;
}

