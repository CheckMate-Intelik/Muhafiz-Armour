import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

enum VehicleTypeEnum {
  B4 = 'B4',
  B5 = 'B5',
  B6 = 'B6',
  B7 = 'B7',
}

export class CreateVehicleDto {
  @IsEnum(VehicleTypeEnum)
  type!: VehicleTypeEnum;

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

