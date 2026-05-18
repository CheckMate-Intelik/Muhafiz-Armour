import { IsIn } from 'class-validator';

export class ExtendBookingDto {
  @IsIn(['ADD_3_HOURS'])
  mode!: 'ADD_3_HOURS';
}
