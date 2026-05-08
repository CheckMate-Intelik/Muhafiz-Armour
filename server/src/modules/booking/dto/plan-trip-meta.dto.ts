import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PlanTripMetaDto {
  @IsOptional()
  @IsString()
  pickupCity?: string;

  @IsOptional()
  @IsString()
  dropCity?: string;

  @Type(() => Number)
  @IsNumber()
  pickupLat!: number;

  @Type(() => Number)
  @IsNumber()
  pickupLng!: number;

  @Type(() => Number)
  @IsNumber()
  dropLat!: number;

  @Type(() => Number)
  @IsNumber()
  dropLng!: number;
}
