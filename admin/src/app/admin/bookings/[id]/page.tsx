'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

export default function AdminBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = segmentParam(params.id);
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getBooking(id);
        if (!cancelled) setRow(data);
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
  }, [id, router]);

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/bookings">
            ← Bookings
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Booking
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : row ? (
          <div className="stack">
            <div className="grid2">
              <div className="stack">
                <div className="h3">Status</div>
                <StatusBadge status={row.status} />
              </div>
              <div className="stack">
                <div className="h3">Total price</div>
                <div className="mono">{row.totalPrice != null ? `Rs ${row.totalPrice}` : '—'}</div>
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Schedule</div>
            <div className="mono">
              {fmt(row.startTime)} <span className="muted">→</span> {fmt(row.endTime)}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Actual: {fmt(row.actualStartTime)} <span className="muted">→</span> {fmt(row.actualEndTime)}
            </div>
            <div className="divider" />
            <div className="h3">Locations</div>
            <div>
              <span className="muted">Pickup</span>
              <div style={{ marginTop: 4 }}>{row.pickupLocation}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="muted">Drop-off</span>
              <div style={{ marginTop: 4 }}>{row.dropLocation}</div>
            </div>
            <div className="divider" />
            <div className="grid2">
              <div className="stack">
                <div className="h3">User</div>
                {row.user ? (
                  <>
                    <Link className="link" href={`/admin/users/${row.user.id}`}>
                      {row.user.name}
                    </Link>
                    <div className="mono muted">{row.user.phone}</div>
                    {row.user.email ? <div className="muted">{row.user.email}</div> : null}
                  </>
                ) : (
                  '—'
                )}
              </div>
              <div className="stack">
                <div className="h3">Driver</div>
                {row.driver ? (
                  <>
                    <Link className="link" href={`/admin/drivers/${row.driver.id}`}>
                      {row.driver.name}
                    </Link>
                    <div className="mono muted">{row.driver.phone}</div>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Vehicle</div>
            {row.vehicle ? (
              <div className="stack">
                <Link className="link" href={`/admin/vehicles/${row.vehicle.id}`}>
                  {[row.vehicle.manufacturer, row.vehicle.generation, row.vehicle.carModel, row.vehicle.year].filter(Boolean).join(' ') || 'Vehicle'}
                </Link>
                <div className="muted">
                  {row.vehicle.armourLevel} · {row.vehicle.vehicleType}
                </div>
                <div className="muted">{row.vehicle.location}</div>
                <div className="mono muted">
                  Plate {row.vehicle.numberPlate ?? '—'} · Reg {row.vehicle.registrationNumber ?? '—'}
                </div>
              </div>
            ) : (
              '—'
            )}
            <div className="divider" />
            <div className="grid2">
              <div>
                <div className="muted">Overtime (minutes)</div>
                <div className="mono">{row.overtimeMinutes ?? '—'}</div>
              </div>
              <div>
                <div className="muted">Created</div>
                <div className="mono">{fmt(row.createdAt)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="muted">Not found.</div>
        )}
      </div>
    </>
  );
}
