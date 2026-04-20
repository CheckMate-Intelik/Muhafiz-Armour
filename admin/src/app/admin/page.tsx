'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type AdminMetrics } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

function MetricCard({
  title,
  value,
  hint,
  href,
}: {
  title: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="metric-card">
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="metric-hint">{hint}</div> : null}
    </div>
  );

  if (!href) return inner;
  return (
    <Link className="metric-link" href={href}>
      {inner}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminMetrics | null>(null);
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
        const res = await api.metrics();
        if (!cancelled) setData(res);
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
          <h1 className="h1">Dashboard</h1>
          <div className="muted">Operational overview</div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="metrics-grid">
        {loading ? (
          <div className="card">
            <div className="muted">Loading…</div>
          </div>
        ) : data ? (
          <>
            <MetricCard title="Pending vehicles" value={`${data.vehicles.pending}`} hint="Awaiting approval" href="/admin/vehicles" />
            <MetricCard title="Active bookings" value={`${data.bookings.active}`} hint="Confirmed / in progress" href="/admin/bookings" />
            <MetricCard title="Pending booking requests" value={`${data.bookings.pendingDriver}`} hint="Awaiting driver action" href="/admin/bookings" />
            <MetricCard title="Completed bookings" value={`${data.bookings.completed}`} hint={`Total bookings: ${data.bookings.total}`} href="/admin/bookings" />

            <MetricCard title="Drivers" value={`${data.drivers.total}`} hint={`Approved: ${data.drivers.approved} • Blocked: ${data.drivers.blocked}`} href="/admin/drivers" />
            <MetricCard title="Vehicles" value={`${data.vehicles.total}`} hint={`Approved: ${data.vehicles.approved} • Pending: ${data.vehicles.pending}`} href="/admin/vehicles" />
            <MetricCard title="Users" value={`${data.users.total}`} hint={`Blocked: ${data.users.blocked}`} href="/admin/users" />
            <MetricCard title="Bookings" value={`${data.bookings.total}`} hint={`Active: ${data.bookings.active} • Completed: ${data.bookings.completed}`} href="/admin/bookings" />
          </>
        ) : (
          <div className="card">
            <div className="muted">No data.</div>
          </div>
        )}
      </div>
    </>
  );
}

