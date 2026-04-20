import { IsBoolean } from 'class-validator';

export class RespondDto {
  @IsBoolean()
  accept!: boolean;
}

