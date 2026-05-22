import { Module } from '@nestjs/common';
import { BookingNotificationsService } from './booking-notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService, BookingNotificationsService],
  exports: [BookingNotificationsService],
})
export class NotificationsModule {}
