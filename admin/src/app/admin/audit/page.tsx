'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuditTimeline } from '@/components/AuditTimeline';
import { ListFilters } from '@/components/ListFilters';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

type Tab = 'admin' | 'security';

export default function AdminAuditPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('admin');
  const [filters, setFilters] = useState<Record<string, string>>({ suspiciousOnly: 'false' });
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === 'admin'
          ? await api.listAdminAudit(filters)
          : await api.listAuthAudit({
              ...filters,
              suspiciousOnly: tab === 'security' && filters.suspiciousOnly !== 'false' ? 'true' : filters.suspiciousOnly,
            });
      setRows(res.rows);
      setTotal(res.total);
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
  }, [tab]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Audit logs</h1>
          <div className="muted">Admin activity and security events</div>
        </div>
      </div>

      <div className="stack-inline" style={{ marginBottom: 14 }}>
        <button type="button" className={`button ${tab === 'admin' ? '' : 'button-secondary'}`} onClick={() => setTab('admin')}>
          Admin activity
        </button>
        <button type="button" className={`button ${tab === 'security' ? '' : 'button-secondary'}`} onClick={() => setTab('security')}>
          Security log
        </button>
      </div>

      <ListFilters
        fields={[
          ...(tab === 'security'
            ? [
                {
                  name: 'suspiciousOnly',
                  label: 'Show',
                  type: 'select' as const,
                  options: [
                    { value: 'true', label: 'Failures & suspicious only' },
                    { value: 'false', label: 'All auth events' },
                  ],
                },
                { name: 'q', label: 'Search email/username' },
              ]
            : []),
          { name: 'from', label: 'From', type: 'date' },
          { name: 'to', label: 'To', type: 'date' },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
        onSubmit={() => void load()}
        onReset={() => {
          setFilters(tab === 'security' ? { suspiciousOnly: 'true' } : {});
          setTimeout(() => void load(), 0);
        }}
      />

      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <div className="muted" style={{ marginBottom: 12 }}>
          {loading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}
        </div>
        {!loading ? <AuditTimeline rows={rows} emptyLabel="No audit events for these filters." /> : null}
      </div>
    </>
  );
}
