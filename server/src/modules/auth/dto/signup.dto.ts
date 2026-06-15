import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  role?: 'USER' | 'DISPATCHER';
}
