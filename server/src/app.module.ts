import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { BookingModule } from './modules/booking/booking.module';
import { DriverModule } from './modules/driver/driver.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [PrismaModule, AuthModule, UserModule, DriverModule, VehicleModule, BookingModule, AdminModule, MediaModule],
})
export class AppModule {}

