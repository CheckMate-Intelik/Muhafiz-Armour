'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ThrottledButton } from '@/components/ThrottledButton';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

export default function AdminUserDetailPage() {
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
      const data = await api.getUser(id);
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

  async function toggleBlock() {
    if (!row) return;
    setBusy(true);
    try {
      await api.blockUser(row.id, !row.isBlocked);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/users">
            ← Users
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            User
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
        {row ? (
          <ThrottledButton type="button" className="button button-secondary" disabled={busy} onClick={() => void toggleBlock()}>
            {row.isBlocked ? 'Unblock' : 'Block'}
          </ThrottledButton>
        ) : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : row ? (
          <div className="stack">
            <div>
              <div className="muted">Name</div>
              <div style={{ marginTop: 4, fontWeight: 800 }}>{row.name}</div>
            </div>
            <div className="grid2">
              <div>
                <div className="muted">Phone</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {row.phone}
                </div>
              </div>
              <div>
                <div className="muted">Email</div>
                <div style={{ marginTop: 4 }}>{row.email ?? '—'}</div>
              </div>
            </div>
            <div className="grid2">
              <div>
                <div className="muted">Blocked</div>
                <div style={{ marginTop: 4 }}>{row.isBlocked ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="muted">Joined</div>
                <div className="mono" style={{ marginTop: 4 }}>
                  {fmt(row.createdAt)}
                </div>
              </div>
            </div>
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
