import { BookingAuditAction } from '@prisma/client';

type AuditRow = {
  action: BookingAuditAction | string;
  actorRole: string;
  actorId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: Date | string;
};

const CLOSURE_ACTIONS = new Set<string>([
  'EXPIRED',
  'DISPATCHER_REJECTED',
  'DISPATCHER_CANCELLED',
  'CANCELLED',
  'ADMIN_FORCE_CANCELLED',
]);

export function resolveAssignedIdsFromAudit(auditLogs: AuditRow[]): {
  vehicleId: string | null;
  dispatcherId: string | null;
} {
  let vehicleId: string | null = null;
  let dispatcherId: string | null = null;

  for (let i = auditLogs.length - 1; i >= 0; i--) {
    const details = auditLogs[i].details;
    if (!details || typeof details !== 'object') continue;
    if (typeof details.vehicleId === 'string') vehicleId = details.vehicleId;
    if (typeof details.dispatcherId === 'string') dispatcherId = details.dispatcherId;
    if (vehicleId && dispatcherId) break;
  }

  return { vehicleId, dispatcherId };
}

export function resolveClosureSummary(auditLogs: AuditRow[]): {
  action: string;
  actorRole: string;
  actorId: string | null;
  label: string;
  at: string;
} | null {
  for (let i = auditLogs.length - 1; i >= 0; i--) {
    const log = auditLogs[i];
    if (!CLOSURE_ACTIONS.has(log.action)) continue;

    const at = new Date(log.createdAt).toISOString();
    const reason =
      log.details && typeof log.details.reason === 'string' ? log.details.reason : null;

    switch (log.action) {
      case 'EXPIRED':
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label:
            reason === 'DISPATCHER_ACCEPT_TIMEOUT'
              ? 'Expired — dispatcher did not accept within the time limit'
              : 'Booking expired',
          at,
        };
      case 'DISPATCHER_REJECTED':
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label: 'Rejected by dispatcher',
          at,
        };
      case 'DISPATCHER_CANCELLED':
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label: 'Cancelled by dispatcher',
          at,
        };
      case 'CANCELLED':
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label: log.actorRole === 'USER' ? 'Cancelled by customer' : 'Booking cancelled',
          at,
        };
      case 'ADMIN_FORCE_CANCELLED':
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label: reason ? `Force-cancelled by admin — ${reason}` : 'Force-cancelled by admin',
          at,
        };
      default:
        return {
          action: log.action,
          actorRole: log.actorRole,
          actorId: log.actorId ?? null,
          label: String(log.action).replace(/_/g, ' ').toLowerCase(),
          at,
        };
    }
  }
  return null;
}
