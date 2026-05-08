import { IsIn } from 'class-validator';

export class ExtendBookingDto {
  @IsIn(['ADD_2_HOURS', 'ADD_1_DAY'])
  mode!: 'ADD_2_HOURS' | 'ADD_1_DAY';
}
