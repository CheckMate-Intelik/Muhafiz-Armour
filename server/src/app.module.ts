import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './modules/booking/booking.module';
import { DispatcherModule } from './modules/dispatcher/dispatcher.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    DispatcherModule,
    VehicleModule,
    BookingModule,
    AdminModule,
    MediaModule,
    NotificationsModule,
  ],
})
export class AppModule {}

