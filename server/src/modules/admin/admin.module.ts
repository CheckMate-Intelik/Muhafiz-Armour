import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [MatchingModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

