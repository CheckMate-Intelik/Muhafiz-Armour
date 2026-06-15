import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './modules/audit/audit.module';
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
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UserModule,
    DispatcherModule,
    VehicleModule,
    BookingModule,
    AdminModule,
    MediaModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
