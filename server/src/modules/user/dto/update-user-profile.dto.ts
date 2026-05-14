import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateUserProfileDto {
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^https:\/\//, { message: 'profileImageUrl must be an https URL' })
  profileImageUrl?: string | null;
}
