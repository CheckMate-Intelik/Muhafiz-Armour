'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ThrottledButton } from '@/components/ThrottledButton';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

const VEHICLE_STATUSES = ['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'BLOCKED'] as const;

type CatalogOption = { code: string; label: string; isActive: boolean };

type VehicleForm = {
  armourLevel: string;
  vehicleType: string;
  manufacturer: string;
  generation: string;
  carModel: string;
  year: string;
  color: string;
  numberPlate: string;
  registrationNumber: string;
  baseRatePerHour: string;
  seatingCapacity: string;
  location: string;
  status: string;
  isApproved: boolean;
  imageUrlsText: string;
};

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

function rowToForm(row: any): VehicleForm {
  return {
    armourLevel: row.armourLevel ?? '',
    vehicleType: row.vehicleType ?? '',
    manufacturer: row.manufacturer ?? '',
    generation: row.generation ?? '',
    carModel: row.carModel ?? '',
    year: row.year != null ? String(row.year) : '',
    color: row.color ?? '',
    numberPlate: row.numberPlate ?? '',
    registrationNumber: row.registrationNumber ?? '',
    baseRatePerHour: row.baseRatePerHour != null ? String(row.baseRatePerHour) : '',
    seatingCapacity: row.seatingCapacity != null ? String(row.seatingCapacity) : '4',
    location: row.location ?? '',
    status: row.status ?? 'AVAILABLE',
    isApproved: Boolean(row.isApproved),
    imageUrlsText: Array.isArray(row.imageUrls) ? row.imageUrls.join('\n') : '',
  };
}

function formToPayload(form: VehicleForm) {
  const imageUrls = form.imageUrlsText
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter(Boolean);
  const year = parseInt(form.year, 10);
  const baseRatePerHour = parseInt(form.baseRatePerHour, 10);
  const seatingCapacity = parseInt(form.seatingCapacity, 10);
  return {
    armourLevel: form.armourLevel.trim(),
    vehicleType: form.vehicleType.trim(),
    manufacturer: form.manufacturer.trim(),
    generation: form.generation.trim(),
    carModel: form.carModel.trim(),
    year: Number.isFinite(year) ? year : undefined,
    color: form.color.trim(),
    numberPlate: form.numberPlate.trim(),
    registrationNumber: form.registrationNumber.trim(),
    baseRatePerHour: Number.isFinite(baseRatePerHour) ? baseRatePerHour : undefined,
    seatingCapacity: Number.isFinite(seatingCapacity) ? seatingCapacity : undefined,
    location: form.location.trim(),
    status: form.status,
    isApproved: form.isApproved,
    imageUrls,
  };
}

export default function AdminVehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = segmentParam(params.id);
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VehicleForm | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [armourOptions, setArmourOptions] = useState<CatalogOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<CatalogOption[]>([]);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehicle(id);
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

  useEffect(() => {
    if (row && !editing) setForm(rowToForm(row));
  }, [row, editing]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [armour, types] = await Promise.all([
          api.listArmourLevelOptions(),
          api.listVehicleTypeOptions(),
        ]);
        if (cancelled) return;
        setArmourOptions(armour.filter((o: CatalogOption) => o.isActive));
        setTypeOptions(types.filter((o: CatalogOption) => o.isActive));
      } catch {
        // Catalog load failure is non-fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit() {
    if (!row) return;
    setForm(rowToForm(row));
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    if (row) setForm(rowToForm(row));
    setSaveError(null);
    setEditing(false);
  }

  function patchForm<K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveEdit() {
    if (!row || !form) return;
    setBusy(true);
    setSaveError(null);
    try {
      const updated = await api.updateVehicle(row.id, formToPayload(form));
      setRow(updated);
      setForm(rowToForm(updated));
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  async function toggleApprove() {
    if (!row) return;
    setBusy(true);
    try {
      await api.approveVehicle(row.id, !row.isApproved);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/vehicles">
            ← Vehicles
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Vehicle
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
        {row ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {editing ? (
              <>
                <ThrottledButton type="button" className="button button-secondary" disabled={busy} onClick={cancelEdit}>
                  Cancel
                </ThrottledButton>
                <ThrottledButton type="button" className="button" disabled={busy} onClick={() => void saveEdit()}>
                  {busy ? 'Saving…' : 'Save changes'}
                </ThrottledButton>
              </>
            ) : (
              <>
                <ThrottledButton type="button" className="button button-secondary" disabled={busy} onClick={startEdit}>
                  Edit details
                </ThrottledButton>
                <ThrottledButton type="button" className="button button-secondary" disabled={busy} onClick={() => void toggleApprove()}>
                  {row.isApproved ? 'Unapprove' : 'Approve'}
                </ThrottledButton>
              </>
            )}
          </div>
        ) : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
      {saveError ? <div className="error" style={{ marginBottom: 12 }}>{saveError}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : row ? (
          editing && form ? (
            <VehicleEditForm
              form={form}
              armourOptions={armourOptions}
              typeOptions={typeOptions}
              onChange={patchForm}
            />
          ) : (
            <VehicleReadView row={row} fmt={fmt} router={router} />
          )
        ) : (
          <div className="muted">Not found.</div>
        )}
      </div>
    </>
  );
}

function VehicleReadView({
  row,
  fmt,
  router,
}: {
  row: any;
  fmt: (dt: string | Date | null | undefined) => string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="stack">
      <div className="grid2">
        <div>
          <div className="muted">Armour level</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {row.armourLevel}
          </div>
        </div>
        <div>
          <div className="muted">Vehicle type</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {row.vehicleType}
          </div>
        </div>
      </div>
      <div>
        <div className="muted">Model</div>
        <div style={{ marginTop: 4, fontWeight: 800 }}>
          {[row.manufacturer, row.generation, row.carModel, row.year].filter(Boolean).join(' ') || '—'}
        </div>
      </div>
      <div className="grid2">
        <div>
          <div className="muted">Colour</div>
          <div style={{ marginTop: 4 }}>{row.color ?? '—'}</div>
        </div>
        <div>
          <div className="muted">Seating</div>
          <div style={{ marginTop: 4 }}>{row.seatingCapacity ?? '—'}</div>
        </div>
      </div>
      <div className="grid2">
        <div>
          <div className="muted">Rate</div>
          <div className="mono" style={{ marginTop: 4 }}>
            Rs {row.baseRatePerHour}/hr
          </div>
        </div>
        <div>
          <div className="muted">Status</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {row.status ?? '—'}
          </div>
        </div>
      </div>
      <div className="grid2">
        <div>
          <div className="muted">Number plate</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {row.numberPlate ?? '—'}
          </div>
        </div>
        <div>
          <div className="muted">Registration</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {row.registrationNumber ?? '—'}
          </div>
        </div>
      </div>
      <div>
        <div className="muted">Location</div>
        <div style={{ marginTop: 4 }}>{row.location}</div>
      </div>
      <div>
        <div className="muted">Approved</div>
        <div style={{ marginTop: 4 }}>{row.isApproved ? 'Yes' : 'No'}</div>
      </div>
      <div>
        <div className="muted">Image URLs</div>
        <div style={{ marginTop: 6 }} className="stack">
          {row.imageUrls?.length ? (
            row.imageUrls.map((u: string, i: number) => (
              <a key={i} className="link mono" href={u} target="_blank" rel="noreferrer">
                {u}
              </a>
            ))
          ) : (
            <span className="muted">—</span>
          )}
        </div>
      </div>
      <div>
        <div className="muted">Created</div>
        <div className="mono" style={{ marginTop: 4 }}>
          {fmt(row.createdAt)}
        </div>
      </div>
      <div className="divider" />
      <div className="h3">Dispatcher</div>
      {row.dispatcher ? (
        <div className="stack">
          <Link className="link" href={`/admin/dispatchers/${row.dispatcher.id}`}>
            {row.dispatcher.name}
          </Link>
          <div className="mono muted">{row.dispatcher.phone}</div>
        </div>
      ) : (
        '—'
      )}
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
  );
}

function VehicleEditForm({
  form,
  armourOptions,
  typeOptions,
  onChange,
}: {
  form: VehicleForm;
  armourOptions: CatalogOption[];
  typeOptions: CatalogOption[];
  onChange: <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => void;
}) {
  return (
    <div className="stack">
      <div className="grid2">
        <label className="label">
          Armour level
          <select
            className="input"
            value={form.armourLevel}
            onChange={(e) => onChange('armourLevel', e.target.value)}>
            <option value="">Select…</option>
            {armourOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label} ({o.code})
              </option>
            ))}
            {form.armourLevel && !armourOptions.some((o) => o.code === form.armourLevel) ? (
              <option value={form.armourLevel}>{form.armourLevel} (inactive)</option>
            ) : null}
          </select>
        </label>
        <label className="label">
          Vehicle type
          <select
            className="input"
            value={form.vehicleType}
            onChange={(e) => onChange('vehicleType', e.target.value)}>
            <option value="">Select…</option>
            {typeOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label} ({o.code})
              </option>
            ))}
            {form.vehicleType && !typeOptions.some((o) => o.code === form.vehicleType) ? (
              <option value={form.vehicleType}>{form.vehicleType} (inactive)</option>
            ) : null}
          </select>
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Manufacturer
          <input className="input" value={form.manufacturer} onChange={(e) => onChange('manufacturer', e.target.value)} />
        </label>
        <label className="label">
          Generation
          <input className="input" value={form.generation} onChange={(e) => onChange('generation', e.target.value)} />
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Car model
          <input className="input" value={form.carModel} onChange={(e) => onChange('carModel', e.target.value)} />
        </label>
        <label className="label">
          Year
          <input
            className="input mono"
            inputMode="numeric"
            value={form.year}
            onChange={(e) => onChange('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Colour
          <input className="input" value={form.color} onChange={(e) => onChange('color', e.target.value)} />
        </label>
        <label className="label">
          Seating capacity
          <input
            className="input mono"
            inputMode="numeric"
            value={form.seatingCapacity}
            onChange={(e) => onChange('seatingCapacity', e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Base rate (Rs/hr)
          <input
            className="input mono"
            inputMode="numeric"
            value={form.baseRatePerHour}
            onChange={(e) => onChange('baseRatePerHour', e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <label className="label">
          Status
          <select className="input" value={form.status} onChange={(e) => onChange('status', e.target.value)}>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid2">
        <label className="label">
          Number plate
          <input className="input mono" value={form.numberPlate} onChange={(e) => onChange('numberPlate', e.target.value)} />
        </label>
        <label className="label">
          Registration number
          <input
            className="input mono"
            value={form.registrationNumber}
            onChange={(e) => onChange('registrationNumber', e.target.value)}
          />
        </label>
      </div>
      <label className="label">
        Location
        <input className="input" value={form.location} onChange={(e) => onChange('location', e.target.value)} />
      </label>
      <label className="label">
        Image URLs (one HTTPS URL per line)
        <textarea
          className="input"
          rows={4}
          value={form.imageUrlsText}
          onChange={(e) => onChange('imageUrlsText', e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={form.isApproved} onChange={(e) => onChange('isApproved', e.target.checked)} />
        <span>Approved for bookings</span>
      </label>
    </div>
  );
}
