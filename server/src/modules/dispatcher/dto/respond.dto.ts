import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class RespondDto {
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  accept!: boolean;
}
