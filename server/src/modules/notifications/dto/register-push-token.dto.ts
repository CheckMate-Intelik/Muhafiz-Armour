import { IsIn, IsString, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(10)
  expoPushToken!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}

export class UnregisterPushTokenDto {
  @IsString()
  @MinLength(10)
  expoPushToken!: string;
}
