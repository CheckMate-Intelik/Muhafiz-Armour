'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuditTimeline } from '@/components/AuditTimeline';
import { BookingInterventions } from '@/components/BookingInterventions';
import { api, ApiError } from '@/lib/api';
import { segmentParam } from '@/lib/route-params';
import { clearSession, getSession } from '@/lib/session';
import { StatusBadge } from '@/components/StatusBadge';

function fmt(dt: string | Date | null | undefined) {
  if (dt == null) return '—';
  return new Date(dt).toLocaleString();
}

type ExtensionRequest = {
  id: string;
  additionalHours: number;
  previousEndTime: string;
  requestedEndTime: string;
  proposedTotalPrice: number;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
};

function ExtensionCard({
  ext,
  index,
  extensionRatePerHour,
}: {
  ext: ExtensionRequest;
  index: number;
  extensionRatePerHour?: number | null;
}) {
  const estimatedCharge =
    extensionRatePerHour != null ? Math.round(extensionRatePerHour * ext.additionalHours) : null;

  return (
    <div
      className="stack"
      style={{
        padding: 14,
        borderRadius: 12,
        border: '1px solid rgba(127, 127, 127, 0.2)',
        background: 'rgba(127, 127, 127, 0.03)',
      }}>
      <div className="stack-inline" style={{ justifyContent: 'space-between' }}>
        <div className="h3">Extension {index + 1}</div>
        <StatusBadge status={ext.status} />
      </div>
      <div className="mono muted" style={{ fontSize: 11 }}>
        {ext.id}
      </div>
      <div className="grid2">
        <div>
          <div className="muted">Additional hours</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {ext.additionalHours} hr{ext.additionalHours === 1 ? '' : 's'}
          </div>
        </div>
        <div>
          <div className="muted">Proposed total price</div>
          <div className="mono" style={{ marginTop: 4 }}>
            Rs {ext.proposedTotalPrice}
          </div>
        </div>
      </div>
      {estimatedCharge != null ? (
        <div>
          <div className="muted">Est. extension charge (rate × hours)</div>
          <div className="mono" style={{ marginTop: 4 }}>
            Rs {estimatedCharge}
            <span className="muted"> @ Rs {extensionRatePerHour}/hr</span>
          </div>
        </div>
      ) : null}
      <div>
        <div className="muted">End time change</div>
        <div className="mono" style={{ marginTop: 4 }}>
          {fmt(ext.previousEndTime)} <span className="muted">→</span> {fmt(ext.requestedEndTime)}
        </div>
      </div>
      <div className="grid2">
        <div>
          <div className="muted">Requested</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {fmt(ext.createdAt)}
          </div>
        </div>
        <div>
          <div className="muted">Resolved</div>
          <div className="mono" style={{ marginTop: 4 }}>
            {fmt(ext.resolvedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = segmentParam(params.id);
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getBooking(id);
        if (!cancelled) setRow(data);
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
  }, [id, router]);

  return (
    <>
      <div className="page-header">
        <div>
          <Link className="link muted" href="/admin/bookings">
            ← Bookings
          </Link>
          <h1 className="h1" style={{ marginTop: 8 }}>
            Booking
          </h1>
          <div className="muted mono">{id || '—'}</div>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="card">
        {loading ? (
          <div className="muted">Loading…</div>
        ) : row ? (
          <div className="stack">
            <div className="grid2">
              <div className="stack">
                <div className="h3">Status</div>
                <div className="stack-inline">
                  <StatusBadge status={row.status} />
                  {row.isUnderReview ? <span className="review-pill">Under review</span> : null}
                </div>
                {row.pendingExpiresAt ? (
                  <div className="muted" style={{ marginTop: 6 }}>
                    Dispatcher accept expires: {fmt(row.pendingExpiresAt)}
                  </div>
                ) : null}
                {row.closureSummary ? (
                  <div className="closure-banner" style={{ marginTop: 10 }}>
                    <div className="h3">{row.closureSummary.label}</div>
                    <div className="muted mono" style={{ marginTop: 4, fontSize: 11 }}>
                      {fmt(row.closureSummary.at)}
                      {row.closureSummary.actorRole && row.closureSummary.actorRole !== 'SYSTEM'
                        ? ` · ${row.closureSummary.actorRole}`
                        : ''}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="stack">
                <div className="h3">Total price</div>
                <div className="mono">{row.totalPrice != null ? `Rs ${row.totalPrice}` : '—'}</div>
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Schedule</div>
            <div className="mono">
              {fmt(row.startTime)} <span className="muted">→</span> {fmt(row.endTime)}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Actual: {fmt(row.actualStartTime)} <span className="muted">→</span> {fmt(row.actualEndTime)}
            </div>
            <div className="divider" />
            <div className="h3">Locations</div>
            <div>
              <span className="muted">Pickup</span>
              <div style={{ marginTop: 4 }}>{row.pickupLocation}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="muted">Drop-off</span>
              <div style={{ marginTop: 4 }}>{row.dropLocation}</div>
            </div>
            <div className="divider" />
            <div className="stack-inline" style={{ justifyContent: 'space-between' }}>
              <div className="h3">Parties</div>
              {row.partiesFromHistory ? <span className="muted">Assigned at time of booking (from history)</span> : null}
            </div>
            <div className="grid2">
              <div className="stack">
                <div className="h3">User</div>
                {row.user ? (
                  <>
                    <Link className="link" href={`/admin/users/${row.user.id}`}>
                      {row.user.name}
                    </Link>
                    <div className="mono muted">{row.user.phone}</div>
                    {row.user.email ? <div className="muted">{row.user.email}</div> : null}
                  </>
                ) : (
                  '—'
                )}
              </div>
              <div className="stack">
                <div className="h3">Dispatcher</div>
                {row.dispatcher ? (
                  <>
                    <Link className="link" href={`/admin/dispatchers/${row.dispatcher.id}`}>
                      {row.dispatcher.name}
                    </Link>
                    <div className="mono muted">{row.dispatcher.phone}</div>
                    {row.dispatcher.email ? <div className="muted">{row.dispatcher.email}</div> : null}
                  </>
                ) : (
                  <div className="muted">No dispatcher was assigned</div>
                )}
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Vehicle</div>
            {row.vehicle ? (
              <div className="stack">
                <Link className="link" href={`/admin/vehicles/${row.vehicle.id}`}>
                  {[row.vehicle.manufacturer, row.vehicle.generation, row.vehicle.carModel, row.vehicle.year].filter(Boolean).join(' ') || 'Vehicle'}
                </Link>
                <div className="muted">
                  {row.vehicle.armourLevel} · {row.vehicle.vehicleType}
                </div>
                <div className="muted">{row.vehicle.location}</div>
                <div className="mono muted">
                  Plate {row.vehicle.numberPlate ?? '—'} · Reg {row.vehicle.registrationNumber ?? '—'}
                </div>
              </div>
            ) : (
              <div className="muted">No vehicle was assigned</div>
            )}
            <div className="divider" />
            <div className="grid2">
              <div>
                <div className="muted">Overtime (minutes)</div>
                <div className="mono">{row.overtimeMinutes ?? '—'}</div>
              </div>
              <div>
                <div className="muted">Created</div>
                <div className="mono">{fmt(row.createdAt)}</div>
              </div>
            </div>
            <div className="divider" />
            <div className="h3">Extensions</div>
            {Array.isArray(row.extensionRequests) && row.extensionRequests.length > 0 ? (
              <div className="stack">
                {row.extensionRequests.map((ext: ExtensionRequest, index: number) => (
                  <ExtensionCard
                    key={ext.id}
                    ext={ext}
                    index={index}
                    extensionRatePerHour={row.vehicle?.extensionRatePerHour}
                  />
                ))}
              </div>
            ) : (
              <div className="muted">No extension requests for this booking.</div>
            )}
            <div className="divider" />
            <div className="h3">Booking timeline</div>
            <AuditTimeline rows={Array.isArray(row.auditLogs) ? row.auditLogs : []} emptyLabel="No timeline events recorded." />
          </div>
        ) : (
          <div className="muted">Not found.</div>
        )}
      </div>

      {row ? (
        <div className="card" style={{ marginTop: 14 }}>
          <BookingInterventions
            booking={row}
            onUpdated={async () => {
              if (!id) return;
              const data = await api.getBooking(id);
              setRow(data);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
