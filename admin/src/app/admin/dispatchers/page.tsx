'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ListFilters } from '@/components/ListFilters';
import { api, ApiError } from '@/lib/api';
import { ThrottledButton } from '@/components/ThrottledButton';
import { clearSession, getSession } from '@/lib/session';

function DispatchersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const key of ['isApproved', 'isBlocked', 'q']) {
      const v = searchParams.get(key);
      if (v) next[key] = v;
    }
    setFilters(next);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDispatchers(filters);
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
  }, [filters, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleApprove(id: string, isApproved: boolean) {
    setBusyId(id);
    try {
      await api.approveDispatcher(id, isApproved);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBlock(id: string, isBlocked: boolean) {
    setBusyId(id);
    try {
      await api.blockDispatcher(id, isBlocked);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function applyFilters() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v.trim()) qs.set(k, v.trim());
    }
    router.push(`/admin/dispatchers${qs.toString() ? `?${qs}` : ''}`);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Dispatchers</h1>
          <div className="muted">Filter and manage dispatcher accounts</div>
        </div>
      </div>

      <ListFilters
        fields={[
          { name: 'q', label: 'Search', placeholder: 'Name, phone, email, ID…' },
          {
            name: 'isApproved',
            label: 'Approved',
            type: 'select',
            options: [
              { value: 'true', label: 'Approved' },
              { value: 'false', label: 'Pending approval' },
            ],
          },
          {
            name: 'isBlocked',
            label: 'Blocked',
            type: 'select',
            options: [
              { value: 'true', label: 'Blocked' },
              { value: 'false', label: 'Not blocked' },
            ],
          },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
        onSubmit={applyFilters}
        onReset={() => router.push('/admin/dispatchers')}
      />

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
                  onClick={() => router.push(`/admin/dispatchers/${d.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/admin/dispatchers/${d.id}`);
                    }
                  }}>
                  <td className="right row-link" onClick={(e) => e.stopPropagation()}>
                    <Link className="link" href={`/admin/dispatchers/${d.id}`}>
                      Open
                    </Link>
                  </td>
                  <td>{d.name}</td>
                  <td className="mono">{d.phone}</td>
                  <td>{d.isApproved ? 'Yes' : 'No'}</td>
                  <td>{d.isBlocked ? 'Yes' : 'No'}</td>
                  <td className="right row-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ThrottledButton className="button button-secondary" disabled={busyId === d.id} onClick={() => toggleApprove(d.id, !d.isApproved)}>
                      {d.isApproved ? 'Unapprove' : 'Approve'}
                    </ThrottledButton>{' '}
                    <ThrottledButton className="button button-secondary" disabled={busyId === d.id} onClick={() => toggleBlock(d.id, !d.isBlocked)}>
                      {d.isBlocked ? 'Unblock' : 'Block'}
                    </ThrottledButton>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No dispatchers match these filters.
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

export default function AdminDispatchersPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <DispatchersPageInner />
    </Suspense>
  );
}
