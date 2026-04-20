import { IsBoolean } from 'class-validator';

export class UpdateBlockDto {
  @IsBoolean()
  isBlocked!: boolean;
}

