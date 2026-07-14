'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ListFilters } from '@/components/ListFilters';
import { api, ApiError } from '@/lib/api';
import { ThrottledButton } from '@/components/ThrottledButton';
import { clearSession, getSession } from '@/lib/session';

function VehiclesPageInner() {
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
    for (const key of ['isApproved', 'city', 'q']) {
      const v = searchParams.get(key);
      if (v) next[key] = v;
    }
    setFilters(next);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listVehicles(filters);
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
      await api.approveVehicle(id, isApproved);
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
    router.push(`/admin/vehicles${qs.toString() ? `?${qs}` : ''}`);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Vehicles</h1>
          <div className="muted">Filter fleet by approval, city, plate, or model</div>
        </div>
      </div>

      <ListFilters
        fields={[
          { name: 'q', label: 'Search', placeholder: 'Plate, reg, model, location, ID…' },
          { name: 'city', label: 'City / location' },
          {
            name: 'isApproved',
            label: 'Approved',
            type: 'select',
            options: [
              { value: 'true', label: 'Approved' },
              { value: 'false', label: 'Pending approval' },
            ],
          },
        ]}
        values={filters}
        onChange={(name, value) => setFilters((prev) => ({ ...prev, [name]: value }))}
        onSubmit={applyFilters}
        onReset={() => router.push('/admin/vehicles')}
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
                <th>Armour / type</th>
                <th>Vehicle</th>
                <th>Plate / Reg</th>
                <th>Rate</th>
                <th>Location</th>
                <th>Dispatcher</th>
                <th>Approved</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr
                  key={v.id}
                  className="row-click"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/admin/vehicles/${v.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/admin/vehicles/${v.id}`);
                    }
                  }}>
                  <td className="right row-link" onClick={(e) => e.stopPropagation()}>
                    <Link className="link" href={`/admin/vehicles/${v.id}`}>
                      Open
                    </Link>
                  </td>
                  <td className="mono">
                    {v.armourLevel} / {v.vehicleType}
                  </td>
                  <td>{[v.manufacturer, v.generation, v.carModel, v.year].filter(Boolean).join(' ') || '—'}</td>
                  <td>{[v.numberPlate, v.registrationNumber].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="mono">Rs {v.baseRatePerHour}/hr</td>
                  <td>{v.location}</td>
                  <td>{v.dispatcher?.name ?? '—'}</td>
                  <td>{v.isApproved ? 'Yes' : 'No'}</td>
                  <td className="right row-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <ThrottledButton className="button button-secondary" disabled={busyId === v.id} onClick={() => toggleApprove(v.id, !v.isApproved)}>
                      {v.isApproved ? 'Unapprove' : 'Approve'}
                    </ThrottledButton>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    No vehicles match these filters.
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

export default function AdminVehiclesPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <VehiclesPageInner />
    </Suspense>
  );
}
