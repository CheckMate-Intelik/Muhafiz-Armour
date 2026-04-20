import { IsEnum, IsInt, IsString, Min } from 'class-validator';

enum VehicleTypeEnum {
  LA = 'LA',
  MA = 'MA',
  HA = 'HA',
}

export class CreateVehicleDto {
  @IsEnum(VehicleTypeEnum)
  type!: VehicleTypeEnum;

  @IsInt()
  @Min(1)
  baseRatePerHour!: number;

  @IsString()
  location!: string;
}

