import { IsInt, Min } from 'class-validator';

export class ExtendBookingDto {
  @IsInt()
  @Min(1)
  hours!: number;
}
