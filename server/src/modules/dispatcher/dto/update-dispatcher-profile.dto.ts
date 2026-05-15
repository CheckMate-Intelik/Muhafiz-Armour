import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateDispatcherProfileDto {
  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;
}
