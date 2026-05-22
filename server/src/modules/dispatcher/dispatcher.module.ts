import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DispatcherController } from './dispatcher.controller';
import { DispatcherService } from './dispatcher.service';

@Module({
  imports: [BookingModule, NotificationsModule],
  controllers: [DispatcherController],
  providers: [DispatcherService],
  exports: [DispatcherService],
})
export class DispatcherModule {}
