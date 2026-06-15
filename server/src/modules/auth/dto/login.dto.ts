import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: 'USER' | 'DISPATCHER';

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
