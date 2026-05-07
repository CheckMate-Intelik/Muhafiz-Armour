'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

const CODE_HINT = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

type OptionRow = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

function OptionTable({
  title,
  rows,
  onSaveRow,
  busyId,
  onRemoveRow,
  removeBusyId,
  addTitle,
  onAdd,
  addBusy,
}: {
  title: string;
  rows: OptionRow[];
  onSaveRow: (id: string, body: { label: string; sortOrder: number; isActive: boolean }) => Promise<void>;
  busyId: string | null;
  onRemoveRow: (id: string) => Promise<void>;
  removeBusyId: string | null;
  addTitle?: string;
  onAdd?: (body: { code: string; label: string; sortOrder: number; isActive: boolean }) => Promise<void>;
  addBusy?: boolean;
}) {
  const [local, setLocal] = useState<OptionRow[]>(rows);
  useEffect(() => {
    setLocal(rows);
  }, [rows]);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 className="h2" style={{ marginBottom: 12 }}>
        {title}
      </h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Edit labels, sort order, and visibility. Remove only works when no vehicle uses that code (otherwise deactivate instead).
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Label</th>
            <th>Sort order</th>
            <th>Active</th>
            <th className="right">Save</th>
            <th className="right">Remove</th>
          </tr>
        </thead>
        <tbody>
          {local.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.code}</td>
              <td>
                <input
                  className="input"
                  value={r.label}
                  onChange={(e) =>
                    setLocal((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
                  }
                />
              </td>
              <td style={{ maxWidth: 120 }}>
                <input
                  className="input mono"
                  inputMode="numeric"
                  value={String(r.sortOrder)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const n = raw === '' ? 0 : parseInt(raw, 10);
                    setLocal((prev) => prev.map((x) => (x.id === r.id ? { ...x, sortOrder: n } : x)));
                  }}
                />
              </td>
              <td>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(e) =>
                      setLocal((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: e.target.checked } : x)))
                    }
                  />
                  <span>Shown to drivers</span>
                </label>
              </td>
              <td className="right">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busyId === r.id || removeBusyId === r.id || !r.label.trim()}
                  onClick={() =>
                    void onSaveRow(r.id, {
                      label: r.label.trim(),
                      sortOrder: Math.max(0, Math.floor(r.sortOrder)),
                      isActive: r.isActive,
                    })
                  }>
                  Save
                </button>
              </td>
              <td className="right">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={busyId === r.id || removeBusyId === r.id}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Remove "${r.code}" (${r.label})? This fails if any vehicle still uses this code.`,
                      )
                    ) {
                      return;
                    }
                    void onRemoveRow(r.id);
                  }}>
                  {removeBusyId === r.id ? '…' : 'Remove'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {addTitle && onAdd ? <AddOptionForm title={addTitle} onAdd={onAdd} busy={addBusy ?? false} /> : null}
    </div>
  );
}

function AddOptionForm({
  title,
  onAdd,
  busy,
}: {
  title: string;
  onAdd: (body: { code: string; label: string; sortOrder: number; isActive: boolean }) => Promise<void>;
  busy: boolean;
}) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('100');
  const [isActive, setIsActive] = useState(true);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    const c = code.trim().toUpperCase();
    if (!CODE_HINT.test(c)) {
      setLocalErr('Code: 1–32 chars, start with letter or digit; then letters, digits, . _ -');
      return;
    }
    if (!label.trim()) {
      setLocalErr('Label is required');
      return;
    }
    const n = parseInt(sortOrder.replace(/\D/g, ''), 10);
    try {
      await onAdd({
        code: c,
        label: label.trim(),
        sortOrder: Number.isFinite(n) ? Math.max(0, n) : 0,
        isActive,
      });
      setCode('');
      setLabel('');
      setSortOrder('100');
      setIsActive(true);
    } catch (err) {
      if (err instanceof ApiError) {
        let msg = err.message;
        try {
          const j = JSON.parse(err.message) as { message?: string | string[] };
          if (typeof j.message === 'string') msg = j.message;
          else if (Array.isArray(j.message)) msg = j.message.join(', ');
        } catch {
          /* keep msg */
        }
        setLocalErr(msg);
      } else {
        setLocalErr(err instanceof Error ? err.message : 'Failed to add');
      }
    }
  }

  return (
    <form className="stack" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(127,127,127,0.2)' }} onSubmit={(e) => void handleSubmit(e)}>
      <div className="h3">{title}</div>
      {localErr ? <div className="error">{localErr}</div> : null}
      <div className="grid2">
        <label className="label">
          Code
          <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. B8 or LIMO" autoComplete="off" />
        </label>
        <label className="label">
          Label
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shown in apps" autoComplete="off" />
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Sort order
          <input className="input mono" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </label>
        <label className="checkbox" style={{ alignSelf: 'flex-end', marginTop: 22 }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>Active (visible in apps)</span>
        </label>
      </div>
      <div>
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}

export default function AdminCatalogPage() {
  const router = useRouter();
  const [armour, setArmour] = useState<OptionRow[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<OptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [addingArmour, setAddingArmour] = useState(false);
  const [addingVehicleType, setAddingVehicleType] = useState(false);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, v] = await Promise.all([api.listArmourLevelOptions(), api.listVehicleTypeOptions()]);
      setArmour(a as OptionRow[]);
      setVehicleTypes(v as OptionRow[]);
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
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveArmour(id: string, body: { label: string; sortOrder: number; isActive: boolean }) {
    setBusyId(id);
    try {
      await api.updateArmourLevelOption(id, body);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveVehicleType(id: string, body: { label: string; sortOrder: number; isActive: boolean }) {
    setBusyId(id);
    try {
      await api.updateVehicleTypeOption(id, body);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function addArmour(body: { code: string; label: string; sortOrder: number; isActive: boolean }) {
    setAddingArmour(true);
    try {
      await api.createArmourLevelOption(body);
      await load();
    } finally {
      setAddingArmour(false);
    }
  }

  async function addVehicleType(body: { code: string; label: string; sortOrder: number; isActive: boolean }) {
    setAddingVehicleType(true);
    try {
      await api.createVehicleTypeOption(body);
      await load();
    } finally {
      setAddingVehicleType(false);
    }
  }

  function parseApiMessage(raw: string) {
    try {
      const j = JSON.parse(raw) as { message?: string | string[] };
      if (typeof j.message === 'string') return j.message;
      if (Array.isArray(j.message)) return j.message.join(', ');
    } catch {
      /* ignore */
    }
    return raw;
  }

  async function removeArmour(id: string) {
    setRemoveBusyId(id);
    setError(null);
    try {
      await api.deleteArmourLevelOption(id);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        router.replace('/login');
        return;
      }
      setError(e instanceof ApiError ? parseApiMessage(e.message) : e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemoveBusyId(null);
    }
  }

  async function removeVehicleType(id: string) {
    setRemoveBusyId(id);
    setError(null);
    try {
      await api.deleteVehicleTypeOption(id);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        router.replace('/login');
        return;
      }
      setError(e instanceof ApiError ? parseApiMessage(e.message) : e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemoveBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Catalog</h1>
          <div className="muted">Armour levels and vehicle types (driver-facing options)</div>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {loading ? (
        <div className="card muted">Loading…</div>
      ) : (
        <>
          <OptionTable
            title="Armour levels"
            rows={armour}
            onSaveRow={saveArmour}
            busyId={busyId}
            onRemoveRow={removeArmour}
            removeBusyId={removeBusyId}
            addTitle="Add armour level"
            onAdd={addArmour}
            addBusy={addingArmour}
          />
          <OptionTable
            title="Vehicle types"
            rows={vehicleTypes}
            onSaveRow={saveVehicleType}
            busyId={busyId}
            onRemoveRow={removeVehicleType}
            removeBusyId={removeBusyId}
            addTitle="Add vehicle type"
            onAdd={addVehicleType}
            addBusy={addingVehicleType}
          />
        </>
      )}
    </>
  );
}
