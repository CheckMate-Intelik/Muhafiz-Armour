'use client';

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
          <div className="muted">Read-only view</div>
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
                <th>User</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Time</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.user?.name ?? '—'}</td>
                  <td>{b.driver?.name ?? '—'}</td>
                  <td>{b.vehicle?.type ?? '—'}</td>
                  <td className="mono">
                    {new Date(b.startTime).toLocaleString()} <span className="muted">→</span> {new Date(b.endTime).toLocaleString()}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="mono">{b.totalPrice != null ? `$${b.totalPrice}` : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
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

