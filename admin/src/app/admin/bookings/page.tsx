'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ListFilters } from '@/components/ListFilters';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

const BOOKING_STATUSES = [
  'REQUESTED',
  'PENDING_DISPATCHER',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'EXPIRED',
].map((s) => ({ value: s, label: s }));

function BookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const key of ['status', 'startDate', 'endDate', 'pickupCity', 'dropCity', 'dispatcherId', 'armourLevel', 'isUnderReview', 'q']) {
      const v = searchParams.get(key);
      if (v) next[key] = v;
    }
    setFilters(next);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBookings(filters);
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

  function applyFilters() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v.trim()) qs.set(k, v.trim());
    }
    router.push(`/admin/bookings${qs.toString() ? `?${qs}` : ''}`);
  }

  function resetFilters() {
    router.push('/admin/bookings');
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Bookings</h1>
          <div className="muted">Filter, search, and open details</div>
        </div>
      </div>

      <ListFilters
        fields={[
          { name: 'q', label: 'Search', placeholder: 'ID, phone, email, plate, city…' },
          { name: 'status', label: 'Status', type: 'select', options: BOOKING_STATUSES },
          { name: 'pickupCity', label: 'Pickup city' },
          { name: 'dropCity', label: 'Drop city' },
          { name: 'armourLevel', label: 'Armour level' },
          { name: 'dispatcherId', label: 'Dispatcher ID' },
          { name: 'startDate', label: 'From date', type: 'date' },
          { name: 'endDate', label: 'To date', type: 'date' },
          {
            name: 'isUnderReview',
            label: 'Review',
            type: 'select',
            options: [
              { value: 'true', label: 'Under review' },
              { value: 'false', label: 'Not under review' },
            ],
          },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
        onSubmit={applyFilters}
        onReset={resetFilters}
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
                <th>User</th>
                <th>Dispatcher</th>
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
                  <td>{b.dispatcher?.name ?? '—'}</td>
                  <td className="mono">{b.vehicle ? `${b.vehicle.armourLevel} / ${b.vehicle.vehicleType}` : '—'}</td>
                  <td className="mono">
                    {new Date(b.startTime).toLocaleString()} <span className="muted">→</span> {new Date(b.endTime).toLocaleString()}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                    {b.isUnderReview ? <span className="review-pill">Review</span> : null}
                  </td>
                  <td className="mono">{b.totalPrice != null ? `Rs ${b.totalPrice}` : '—'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No bookings match these filters.
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

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <BookingsPageInner />
    </Suspense>
  );
}
