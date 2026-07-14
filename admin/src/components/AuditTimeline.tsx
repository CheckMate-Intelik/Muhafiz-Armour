'use client';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

export type AuditLogRow = {
  id: string;
  action?: string;
  actionType?: string;
  eventType?: string;
  actorRole?: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  admin?: { username: string; displayName: string | null };
  email?: string | null;
  username?: string | null;
  message?: string | null;
  ipAddress?: string | null;
};

function labelFor(row: AuditLogRow) {
  return row.action ?? row.actionType ?? row.eventType ?? 'EVENT';
}

function detailsSummary(details: Record<string, unknown> | null | undefined) {
  if (!details || typeof details !== 'object') return null;
  const parts: string[] = [];
  if (typeof details.reason === 'string') parts.push(`Reason: ${details.reason}`);
  if (typeof details.isApproved === 'boolean') parts.push(`Approved: ${details.isApproved}`);
  if (typeof details.isBlocked === 'boolean') parts.push(`Blocked: ${details.isBlocked}`);
  if (typeof details.isUnderReview === 'boolean') parts.push(`Under review: ${details.isUnderReview}`);
  if (typeof details.vehicleId === 'string') parts.push(`Vehicle: ${details.vehicleId.slice(0, 8)}…`);
  if (typeof details.extraMinutes === 'number') parts.push(`+${details.extraMinutes} min`);
  if (parts.length) return parts.join(' · ');
  try {
    return JSON.stringify(details);
  } catch {
    return null;
  }
}

export function AuditTimeline({ rows, emptyLabel = 'No audit events.' }: { rows: AuditLogRow[]; emptyLabel?: string }) {
  if (!rows.length) return <div className="muted">{emptyLabel}</div>;

  return (
    <div className="audit-timeline">
      {rows.map((row) => (
        <div key={row.id} className="audit-item">
          <div className="stack-inline" style={{ justifyContent: 'space-between' }}>
            <div className="h3">{labelFor(row)}</div>
            <div className="mono muted" style={{ fontSize: 11 }}>
              {fmt(row.createdAt)}
            </div>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            {row.admin ? (
              <span>Admin {row.admin.displayName || row.admin.username}</span>
            ) : row.actorRole ? (
              <span>Actor: {row.actorRole}</span>
            ) : row.email || row.username ? (
              <span>{row.email || row.username}</span>
            ) : null}
            {row.fromStatus || row.toStatus ? (
              <span>
                {row.admin || row.actorRole || row.email ? ' · ' : ''}
                {row.fromStatus ?? '—'} → {row.toStatus ?? '—'}
              </span>
            ) : null}
          </div>
          {detailsSummary(row.details as Record<string, unknown> | null) ? (
            <div className="mono muted" style={{ marginTop: 6, fontSize: 11 }}>
              {detailsSummary(row.details as Record<string, unknown> | null)}
            </div>
          ) : row.message ? (
            <div className="mono muted" style={{ marginTop: 6, fontSize: 11 }}>
              {row.message}
            </div>
          ) : null}
          {row.ipAddress ? (
            <div className="mono muted" style={{ marginTop: 4, fontSize: 10 }}>
              IP {row.ipAddress}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
