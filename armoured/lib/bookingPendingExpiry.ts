/** Must match server `DISPATCHER_ACCEPT_TIMEOUT_MS` (1 hour). */
export const DISPATCHER_ACCEPT_TIMEOUT_MS = 60 * 60 * 1000;

export function formatExpiresInLabel(expiresAtIso: string | null | undefined, nowMs = Date.now()) {
  if (!expiresAtIso) return null;
  const expiresMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresMs)) return null;
  const diffMs = expiresMs - nowMs;
  if (diffMs <= 0) return 'Expired';

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function isPendingAwaitingDispatcher(status: string | null | undefined) {
  return (status ?? '').trim().toUpperCase() === 'PENDING_DISPATCHER';
}

/** Server field when available; otherwise derive from createdAt (1h after submission). */
export function resolvePendingExpiresAt(
  status: string | null | undefined,
  pendingExpiresAt?: string | null,
  createdAt?: string | null,
): string | null {
  if (!isPendingAwaitingDispatcher(status)) return null;
  if (pendingExpiresAt) {
    const ms = new Date(pendingExpiresAt).getTime();
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  if (!createdAt) return null;
  const baseMs = new Date(createdAt).getTime();
  if (!Number.isFinite(baseMs)) return null;
  return new Date(baseMs + DISPATCHER_ACCEPT_TIMEOUT_MS).toISOString();
}
