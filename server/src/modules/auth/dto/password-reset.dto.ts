import { IsEmail, IsIn, IsString, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsIn(['USER', 'DISPATCHER'])
  role!: 'USER' | 'DISPATCHER';
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsIn(['USER', 'DISPATCHER'])
  role!: 'USER' | 'DISPATCHER';

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
