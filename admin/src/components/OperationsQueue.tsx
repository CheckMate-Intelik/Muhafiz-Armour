'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { OperationsQueue } from '@/lib/api';

function fmtMinutes(ms: number | null | undefined) {
  if (ms == null) return '—';
  if (ms <= 0) return 'Expired';
  const m = Math.ceil(ms / 60000);
  return `${m} min left`;
}

function QueueSection({
  title,
  count,
  children,
  href,
}: {
  title: string;
  count: number;
  children: ReactNode;
  href?: string;
}) {
  if (count === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="stack-inline" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="h2">{title}</div>
          <div className="muted">{count} item{count === 1 ? '' : 's'} need attention</div>
        </div>
        {href ? (
          <Link className="link" href={href}>
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function OperationsQueuePanel({ data, loading }: { data: OperationsQueue | null; loading: boolean }) {
  if (loading) return <div className="card muted">Loading queue…</div>;
  if (!data) return null;

  const total =
    data.counts.pendingDispatchers +
    data.counts.pendingVehicles +
    data.counts.expiringBookings +
    data.counts.pendingExtensions +
    data.counts.blockedUsersWithActivity +
    data.counts.blockedDispatchersWithActivity;

  if (total === 0) {
    return (
      <div className="card">
        <div className="h2">Needs attention</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Nothing urgent right now.
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ marginBottom: 22 }}>
      <div>
        <div className="h2">Needs attention</div>
        <div className="muted">{total} open item{total === 1 ? '' : 's'}</div>
      </div>

      <QueueSection title="Pending dispatcher approvals" count={data.counts.pendingDispatchers} href="/admin/dispatchers?isApproved=false">
        <table className="table">
          <tbody>
            {data.pendingDispatchers.map((d) => (
              <tr key={d.id} className="row-click">
                <td>
                  <Link className="link" href={`/admin/dispatchers/${d.id}`}>
                    {d.name}
                  </Link>
                </td>
                <td className="mono">{d.phone}</td>
                <td className="muted">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>

      <QueueSection title="Pending vehicle approvals" count={data.counts.pendingVehicles} href="/admin/vehicles?isApproved=false">
        <table className="table">
          <tbody>
            {data.pendingVehicles.map((v: any) => (
              <tr key={v.id}>
                <td>
                  <Link className="link" href={`/admin/vehicles/${v.id}`}>
                    {v.armourLevel} / {v.vehicleType}
                  </Link>
                </td>
                <td>{v.dispatcher?.name ?? '—'}</td>
                <td>{v.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>

      <QueueSection title="Bookings expiring soon" count={data.counts.expiringBookings} href="/admin/bookings?status=PENDING_DISPATCHER">
        <table className="table">
          <tbody>
            {data.expiringBookings.map((b: any) => (
              <tr key={b.id}>
                <td>
                  <Link className="link" href={`/admin/bookings/${b.id}`}>
                    {b.user?.name ?? 'Booking'}
                  </Link>
                </td>
                <td>{b.dispatcher?.name ?? '—'}</td>
                <td className="mono">{fmtMinutes(b.msUntilExpiry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>

      <QueueSection title="Pending extension requests" count={data.counts.pendingExtensions} href="/admin/bookings">
        <table className="table">
          <tbody>
            {data.pendingExtensions.map((ext: any) => (
              <tr key={ext.id}>
                <td>
                  <Link className="link" href={`/admin/bookings/${ext.booking.id}`}>
                    {ext.booking.user?.name ?? 'Booking'}
                  </Link>
                </td>
                <td className="mono">+{ext.additionalHours}h</td>
                <td>{ext.booking.dispatcher?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>

      <QueueSection title="Blocked users with recent activity" count={data.counts.blockedUsersWithActivity} href="/admin/users">
        <table className="table">
          <tbody>
            {data.blockedUsersWithActivity.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link className="link" href={`/admin/users/${u.id}`}>
                    {u.name}
                  </Link>
                </td>
                <td className="mono">{u.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>

      <QueueSection title="Blocked dispatchers with recent activity" count={data.counts.blockedDispatchersWithActivity} href="/admin/dispatchers?isBlocked=true">
        <table className="table">
          <tbody>
            {data.blockedDispatchersWithActivity.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link className="link" href={`/admin/dispatchers/${d.id}`}>
                    {d.name}
                  </Link>
                </td>
                <td className="mono">{d.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </QueueSection>
    </div>
  );
}
