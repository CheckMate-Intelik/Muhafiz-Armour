import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminReasonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
