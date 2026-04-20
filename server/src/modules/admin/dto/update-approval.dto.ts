import { IsBoolean } from 'class-validator';

export class UpdateApprovalDto {
  @IsBoolean()
  isApproved!: boolean;
}

