'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

export default function AdminDriverDetailPage() {
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
      const data = await api.getDriver(id);
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
      await api.approveDriver(row.id, !row.isApproved);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!row) return;
    setBusy(true);
    try {
      await api.blockDriver(row.id, !row.isBlocked);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/drivers">
            ← Drivers
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Driver
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
        {row ? (
          <div className="stack-inline">
            <button type="button" className="button button-secondary" disabled={busy} onClick={() => void toggleApprove()}>
              {row.isApproved ? 'Unapprove' : 'Approve'}
            </button>
            <button type="button" className="button button-secondary" disabled={busy} onClick={() => void toggleBlock()}>
              {row.isBlocked ? 'Unblock' : 'Block'}
            </button>
          </div>
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
                <div className="muted">Name</div>
                <div style={{ marginTop: 4, fontWeight: 800 }}>{row.name}</div>
              </div>
              <div>
                <div className="muted">Phone</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.phone}
                </div>
              </div>
            </div>
            {row.email ? (
              <div>
                <div className="muted">Email</div>
                <div style={{ marginTop: 4 }}>{row.email}</div>
              </div>
            ) : null}
            <div className="grid2">
              <div>
                <div className="muted">Approved</div>
                <div style={{ marginTop: 4 }}>{row.isApproved ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="muted">Blocked</div>
                <div style={{ marginTop: 4 }}>{row.isBlocked ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div>
              <div className="muted">Joined</div>
              <div className="mono" style={{ marginTop: 4 }}>
                {fmt(row.createdAt)}
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Vehicles ({row.vehicles?.length ?? 0})</div>
            {row.vehicles?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Armour / type</th>
                    <th>Location</th>
                    <th>Rate</th>
                    <th>Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {row.vehicles.map((v: any) => (
                    <tr
                      key={v.id}
                      className="row-click"
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(`/admin/vehicles/${v.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/admin/vehicles/${v.id}`);
                      }}>
                      <td>{[v.manufacturer, v.generation, v.carModel, v.year].filter(Boolean).join(' ') || '—'}</td>
                      <td className="mono">
                        {v.armourLevel} / {v.vehicleType}
                      </td>
                      <td>{v.location}</td>
                      <td className="mono">Rs {v.baseRatePerHour}/hr</td>
                      <td>{v.isApproved ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="muted">No vehicles.</div>
            )}
          </div>
        ) : (
          <div className="muted">Not found.</div>
        )}
      </div>
    </>
  );
}
