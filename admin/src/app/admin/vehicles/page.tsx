'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

export default function AdminVehiclesPage() {
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
      const data = await api.listVehicles();
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
      await api.approveVehicle(id, isApproved);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Vehicles</h1>
          <div className="muted">Approve vehicle listings</div>
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
                <th>Armour</th>
                <th>Vehicle</th>
                <th>Plate / Reg</th>
                <th>Rate</th>
                <th>Location</th>
                <th>Driver</th>
                <th>Approved</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.type}</td>
                  <td>{[v.manufacturer, v.generation, v.carModel, v.year].filter(Boolean).join(' ') || '—'}</td>
                  <td>{[v.numberPlate, v.registrationNumber].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="mono">${v.baseRatePerHour}/hr</td>
                  <td>{v.location}</td>
                  <td>{v.driver?.name ?? '—'}</td>
                  <td>{v.isApproved ? 'Yes' : 'No'}</td>
                  <td className="right">
                    <button className="button button-secondary" disabled={busyId === v.id} onClick={() => toggleApprove(v.id, !v.isApproved)}>
                      {v.isApproved ? 'Unapprove' : 'Approve'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    No vehicles.
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

