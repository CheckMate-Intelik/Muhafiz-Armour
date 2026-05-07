import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const CODE_RE = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class CreateCatalogOptionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(CODE_RE, { message: 'Code must be 1–32 chars: letters, digits, dot, underscore, hyphen; start with letter or digit' })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
