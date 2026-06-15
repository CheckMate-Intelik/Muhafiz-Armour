import { Injectable } from '@nestjs/common';
import {
  AdminActionType,
  AuthEventType,
  BookingAuditAction,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAuthEvent(input: {
    eventType: AuthEventType;
    role?: string;
    email?: string;
    username?: string;
    message?: string;
    meta?: RequestMeta;
  }) {
    await this.prisma.authAuditLog.create({
      data: {
        eventType: input.eventType,
        role: input.role ?? null,
        email: input.email ?? null,
        username: input.username ?? null,
        message: input.message ?? null,
        ipAddress: input.meta?.ipAddress ?? null,
        userAgent: input.meta?.userAgent ?? null,
      },
    });
  }

  async logAdminAction(input: {
    adminId: string;
    actionType: AdminActionType;
    targetType?: string;
    targetId?: string;
    details?: Record<string, unknown>;
    meta?: RequestMeta;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        actionType: input.actionType,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        details: (input.details ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.meta?.ipAddress ?? null,
      },
    });
  }

  async logBookingAction(input: {
    bookingId: string;
    actorRole: string;
    actorId?: string;
    action: BookingAuditAction;
    fromStatus?: BookingStatus;
    toStatus?: BookingStatus;
    details?: Record<string, unknown>;
  }) {
    await this.prisma.bookingAuditLog.create({
      data: {
        bookingId: input.bookingId,
        actorRole: input.actorRole,
        actorId: input.actorId ?? null,
        action: input.action,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        details: (input.details ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
