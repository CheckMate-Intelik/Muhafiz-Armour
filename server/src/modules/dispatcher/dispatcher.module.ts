import { Module } from '@nestjs/common';
import { DispatcherController } from './dispatcher.controller';
import { DispatcherService } from './dispatcher.service';

@Module({
  controllers: [DispatcherController],
  providers: [DispatcherService],
  exports: [DispatcherService],
})
export class DispatcherModule {}
