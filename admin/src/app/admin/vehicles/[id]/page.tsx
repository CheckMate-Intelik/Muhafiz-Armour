'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

export default function AdminVehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = segmentParam(params.id);
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehicle(id);
      setRow(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        router.replace('/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleApprove() {
    if (!row) return;
    setBusy(true);
    try {
      await api.approveVehicle(row.id, !row.isApproved);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/vehicles">
            ← Vehicles
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Vehicle
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
        {row ? (
          <button type="button" className="button button-secondary" disabled={busy} onClick={() => void toggleApprove()}>
            {row.isApproved ? 'Unapprove' : 'Approve'}
          </button>
        ) : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : row ? (
          <div className="stack">
            <div className="grid2">
              <div>
                <div className="muted">Armour level</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.armourLevel}
                </div>
              </div>
              <div>
                <div className="muted">Vehicle type</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.vehicleType}
                </div>
              </div>
            </div>
            <div>
              <div className="muted">Model</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{[row.manufacturer, row.generation, row.carModel, row.year].filter(Boolean).join(' ') || '—'}</div>
            </div>
            <div className="grid2">
              <div>
                <div className="muted">Colour</div>
                <div style={{ marginTop: 4 }}>{row.color ?? '—'}</div>
              </div>
              <div>
                <div className="muted">Rate</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  Rs {row.baseRatePerHour}/hr
                </div>
              </div>
            </div>
            <div className="grid2">
              <div>
                <div className="muted">Number plate</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.numberPlate ?? '—'}
                </div>
              </div>
              <div>
                <div className="muted">Registration</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.registrationNumber ?? '—'}
                </div>
              </div>
            </div>
            <div>
              <div className="muted">Location</div>
              <div style={{ marginTop: 4 }}>{row.location}</div>
            </div>
            <div>
              <div className="muted">Approved</div>
              <div style={{ marginTop: 4 }}>{row.isApproved ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div className="muted">Image URLs</div>
              <div style={{ marginTop: 6 }} className="stack">
                {row.imageUrls?.length ? (
                  row.imageUrls.map((u: string, i: number) => (
                    <a key={i} className="link mono" href={u} target="_blank" rel="noreferrer">
                      {u}
                    </a>
                  ))
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="muted">Created</div>
              <div className="mono" style={{ marginTop: 4 }}>
                {fmt(row.createdAt)}
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Driver</div>
            {row.driver ? (
              <div className="stack">
                <Link className="link" href={`/admin/drivers/${row.driver.id}`}>
                  {row.driver.name}
                </Link>
                <div className="mono muted">{row.driver.phone}</div>
              </div>
            ) : (
              '—'
            )}
            <div className="divider" />
            <div className="h3">Recent bookings ({row.bookings?.length ?? 0})</div>
            {row.bookings?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {row.bookings.map((b: any) => (
                    <tr
                      key={b.id}
                      className="row-click"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/admin/bookings/${b.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/admin/bookings/${b.id}`);
                      }}>
                      <td className="mono">
                        {fmt(b.startTime)} <span className="muted">→</span> {fmt(b.endTime)}
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="mono">{b.totalPrice != null ? `Rs ${b.totalPrice}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">No bookings.</div>
            )}
          </div>
        ) : (
          <div className="muted">Not found.</div>
        )}
      </div>
    </>
  );
}
