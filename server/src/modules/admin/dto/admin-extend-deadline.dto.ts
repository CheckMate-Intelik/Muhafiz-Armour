import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdminExtendDeadlineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  /** Minutes from now until dispatcher accept expires (default 60). */
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  extraMinutes?: number;
}
