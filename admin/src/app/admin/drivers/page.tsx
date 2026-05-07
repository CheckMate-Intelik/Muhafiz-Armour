'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

export default function AdminDriversPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDrivers();
      setRows(data);
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
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleApprove(id: string, isApproved: boolean) {
    setBusyId(id);
    try {
      await api.approveDriver(id, isApproved);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBlock(id: string, isBlocked: boolean) {
    setBusyId(id);
    try {
      await api.blockDriver(id, isBlocked);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Drivers</h1>
          <div className="muted">Click a row for details · Use actions without leaving the list</div>
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
                <th>Name</th>
                <th>Phone</th>
                <th>Approved</th>
                <th>Blocked</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.id}
                  className="row-click"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/admin/drivers/${d.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/admin/drivers/${d.id}`);
                    }
                  }}>
                  <td className="right row-link" onClick={(e) => e.stopPropagation()}>
                    <Link className="link" href={`/admin/drivers/${d.id}`}>
                      Open
                    </Link>
                  </td>
                  <td>{d.name}</td>
                  <td className="mono">{d.phone}</td>
                  <td>{d.isApproved ? 'Yes' : 'No'}</td>
                  <td>{d.isBlocked ? 'Yes' : 'No'}</td>
                  <td className="right row-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <button className="button button-secondary" disabled={busyId === d.id} onClick={() => toggleApprove(d.id, !d.isApproved)}>
                      {d.isApproved ? 'Unapprove' : 'Approve'}
                    </button>{' '}
                    <button className="button button-secondary" disabled={busyId === d.id} onClick={() => toggleBlock(d.id, !d.isBlocked)}>
                      {d.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No drivers.
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

