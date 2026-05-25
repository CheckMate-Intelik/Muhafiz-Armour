import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.types';
import { RegisterPushTokenDto, UnregisterPushTokenDto } from './dto/register-push-token.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(user: JwtPayload, dto: RegisterPushTokenDto) {
    const existing = await this.prisma.pushDeviceToken.findUnique({
      where: { expoPushToken: dto.expoPushToken },
    });

    if (user.role === 'USER') {
      return this.prisma.pushDeviceToken.upsert({
        where: { expoPushToken: dto.expoPushToken },
        create: {
          expoPushToken: dto.expoPushToken,
          platform: dto.platform,
          userId: user.sub,
        },
        update: {
          platform: dto.platform,
          userId: user.sub,
          dispatcherId: null,
        },
      });
    }

    return this.prisma.pushDeviceToken.upsert({
      where: { expoPushToken: dto.expoPushToken },
      create: {
        expoPushToken: dto.expoPushToken,
        platform: dto.platform,
        dispatcherId: user.sub,
      },
      update: {
        platform: dto.platform,
        dispatcherId: user.sub,
        userId: null,
      },
    });
  }

  async unregister(user: JwtPayload, dto: UnregisterPushTokenDto) {
    const existing = await this.prisma.pushDeviceToken.findUnique({
      where: { expoPushToken: dto.expoPushToken },
    });
    if (!existing) return { ok: true };

    if (user.role === 'USER') {
      const dispatcherId = existing.dispatcherId;
      if (!dispatcherId) {
        await this.prisma.pushDeviceToken.delete({ where: { expoPushToken: dto.expoPushToken } });
        return { ok: true };
      }
      await this.prisma.pushDeviceToken.update({
        where: { expoPushToken: dto.expoPushToken },
        data: { userId: null },
      });
      return { ok: true };
    }

    const userId = existing.userId;
    if (!userId) {
      await this.prisma.pushDeviceToken.delete({ where: { expoPushToken: dto.expoPushToken } });
      return { ok: true };
    }
    await this.prisma.pushDeviceToken.update({
      where: { expoPushToken: dto.expoPushToken },
      data: { dispatcherId: null },
    });
    return { ok: true };
  }
}
