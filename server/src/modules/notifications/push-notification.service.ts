import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../../prisma/prisma.service';

export type PushDataPayload = {
  bookingId: string;
  status: string;
  role: 'USER' | 'DISPATCHER';
  kind: string;
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  private enabled() {
    return process.env.PUSH_NOTIFICATIONS_ENABLED !== 'false';
  }

  async sendToUser(userId: string, title: string, body: string, data: PushDataPayload) {
    const tokens = await this.prisma.pushDeviceToken.findMany({
      where: { userId, dispatcherId: null },
      select: { expoPushToken: true },
    });
    await this.sendToTokens(tokens.map((t) => t.expoPushToken), title, body, { ...data, role: 'USER' });
  }

  async sendToDispatcher(dispatcherId: string, title: string, body: string, data: PushDataPayload) {
    const tokens = await this.prisma.pushDeviceToken.findMany({
      where: { dispatcherId, userId: null },
      select: { expoPushToken: true },
    });
    await this.sendToTokens(tokens.map((t) => t.expoPushToken), title, body, { ...data, role: 'DISPATCHER' });
  }

  private async sendToTokens(tokens: string[], title: string, body: string, data: PushDataPayload) {
    if (!this.enabled() || tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token)) {
        this.logger.warn(`Skipping invalid Expo push token: ${token}`);
        continue;
      }
      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        channelId: 'bookings',
      });
    }

    if (messages.length === 0) return;

    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];
      for (const chunk of chunks) {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      }
      await this.pruneInvalidTokens(tickets, messages);
    } catch (err) {
      this.logger.error('Failed to send push notifications', err instanceof Error ? err.stack : String(err));
    }
  }

  private async pruneInvalidTokens(tickets: ExpoPushTicket[], messages: ExpoPushMessage[]) {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status !== 'error') continue;
      if (ticket.details?.error !== 'DeviceNotRegistered') continue;
      const to = messages[i]?.to;
      if (typeof to === 'string') {
        await this.prisma.pushDeviceToken.deleteMany({ where: { expoPushToken: to } }).catch(() => null);
      }
    }
  }
}
