'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

export default function AdminBookingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.listBookings();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Bookings</h1>
          <div className="muted">Click a row for full details</div>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="right">Open</th>
                <th>User</th>
                <th>Driver</th>
                <th>Armour / type</th>
                <th>Time</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="row-click"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/admin/bookings/${b.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/admin/bookings/${b.id}`);
                    }
                  }}>
                  <td className="right row-link" onClick={(e) => e.stopPropagation()}>
                    <Link className="link" href={`/admin/bookings/${b.id}`}>
                      Open
                    </Link>
                  </td>
                  <td>{b.user?.name ?? '—'}</td>
                  <td>{b.driver?.name ?? '—'}</td>
                  <td className="mono">
                    {b.vehicle ? `${b.vehicle.armourLevel} / ${b.vehicle.vehicleType}` : '—'}
                  </td>
                  <td className="mono">
                    {new Date(b.startTime).toLocaleString()} <span className="muted">→</span> {new Date(b.endTime).toLocaleString()}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="mono">{b.totalPrice != null ? `Rs ${b.totalPrice}` : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No bookings.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

