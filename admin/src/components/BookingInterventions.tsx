'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ThrottledButton } from '@/components/ThrottledButton';

type Props = {
  booking: any;
  onUpdated: () => void | Promise<void>;
};

export function BookingInterventions({ booking, onUpdated }: Props) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState(booking.adminReviewNote ?? '');
  const [vehicleId, setVehicleId] = useState('');
  const [extraMinutes, setExtraMinutes] = useState('60');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const cancellable = ['REQUESTED', 'PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);
  const reassignable = ['PENDING_DISPATCHER', 'CONFIRMED', 'IN_PROGRESS'].includes(booking.status);
  const extendable = booking.status === 'PENDING_DISPATCHER';

  async function run(action: () => Promise<any>) {
    if (!reason.trim()) {
      setError('A reason is required for all admin actions.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await onUpdated();
      setMessage('Action applied.');
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="h3">Admin interventions</div>
      <div className="muted">Rare overrides — all actions are audited and require a reason.</div>

      {booking.isUnderReview ? (
        <div className="card" style={{ borderColor: 'rgba(234, 179, 8, 0.5)', background: 'rgba(234, 179, 8, 0.08)' }}>
          <div className="h3">Under review</div>
          {booking.adminReviewNote ? <div style={{ marginTop: 6 }}>{booking.adminReviewNote}</div> : null}
        </div>
      ) : null}

      <label className="label">
        Reason (required)
        <textarea
          className="input"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this action needed?"
        />
      </label>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="muted">{message}</div> : null}

      <div className="stack" style={{ gap: 16 }}>
        <div className="card">
          <div className="h3">Mark under review</div>
          <label className="label" style={{ marginTop: 10 }}>
            Internal note
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="stack-inline" style={{ marginTop: 10 }}>
            <ThrottledButton
              className="button button-secondary"
              disabled={busy}
              onClick={() => run(() => api.setBookingReview(booking.id, { isUnderReview: true, reason, note }))}>
              Mark under review
            </ThrottledButton>
            {booking.isUnderReview ? (
              <ThrottledButton
                className="button button-secondary"
                disabled={busy}
                onClick={() => run(() => api.setBookingReview(booking.id, { isUnderReview: false, reason }))}>
                Clear review flag
              </ThrottledButton>
            ) : null}
          </div>
        </div>

        {cancellable ? (
          <div className="card">
            <div className="h3">Force cancel</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Sets status to REJECTED and frees the vehicle.
            </div>
            <ThrottledButton
              className="button"
              style={{ marginTop: 10 }}
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Force-cancel this booking?')) return;
                void run(() => api.forceCancelBooking(booking.id, reason));
              }}>
              Force cancel booking
            </ThrottledButton>
          </div>
        ) : null}

        {extendable ? (
          <div className="card">
            <div className="h3">Extend dispatcher deadline</div>
            <label className="label" style={{ marginTop: 10 }}>
              Minutes until expiry
              <input className="input" type="number" min={5} max={240} value={extraMinutes} onChange={(e) => setExtraMinutes(e.target.value)} />
            </label>
            <ThrottledButton
              className="button button-secondary"
              style={{ marginTop: 10 }}
              disabled={busy}
              onClick={() =>
                run(() => api.extendDispatcherDeadline(booking.id, reason, Number(extraMinutes) || 60))
              }>
              Extend deadline
            </ThrottledButton>
          </div>
        ) : null}

        {reassignable ? (
          <div className="card">
            <div className="h3">Reassign vehicle</div>
            <label className="label" style={{ marginTop: 10 }}>
              New vehicle ID
              <input className="input mono" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="UUID from vehicle search" />
            </label>
            <ThrottledButton
              className="button button-secondary"
              style={{ marginTop: 10 }}
              disabled={busy || !vehicleId.trim()}
              onClick={() => {
                if (!window.confirm('Reassign this booking to a different vehicle?')) return;
                void run(() => api.reassignBooking(booking.id, vehicleId.trim(), reason));
              }}>
              Reassign booking
            </ThrottledButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
