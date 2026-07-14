'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState, type ReactNode } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { api, ApiError } from '@/lib/api';
import { clearSession, getSession } from '@/lib/session';

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) router.replace('/login');
  }, [router]);

  async function runSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.globalSearch(trimmed);
      setResults(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        router.replace('/login');
        return;
      }
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = searchParams.get('q');
    if (initial?.trim()) {
      setQ(initial);
      void runSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(`/admin/search${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`);
    void runSearch(trimmed);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="h1">Global search</h1>
          <div className="muted">Booking ID, phone, email, plate number, name, or city</div>
        </div>
      </div>

      <form className="card" onSubmit={onSubmit}>
        <label className="label">
          Search
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. booking UUID, +92…, LHE-123" />
        </label>
        <button type="submit" className="button" style={{ marginTop: 12 }} disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <div className="error" style={{ marginTop: 14 }}>{error}</div> : null}

      {results ? (
        <div className="stack" style={{ marginTop: 14 }}>
          <Section title="Bookings" empty={!results.bookings?.length}>
            {results.bookings?.map((b: any) => (
              <div key={b.id} className="search-result">
                <Link className="link" href={`/admin/bookings/${b.id}`}>
                  {b.user?.name ?? 'Booking'} — {b.pickupCity ?? b.pickupLocation}
                </Link>
                <div className="stack-inline" style={{ marginTop: 6 }}>
                  <StatusBadge status={b.status} />
                  <span className="mono muted">{b.id}</span>
                </div>
              </div>
            ))}
          </Section>

          <Section title="Users" empty={!results.users?.length}>
            {results.users?.map((u: any) => (
              <div key={u.id} className="search-result">
                <Link className="link" href={`/admin/users/${u.id}`}>
                  {u.name}
                </Link>
                <div className="mono muted" style={{ marginTop: 4 }}>
                  {u.phone} {u.email ? `· ${u.email}` : ''}
                </div>
              </div>
            ))}
          </Section>

          <Section title="Dispatchers" empty={!results.dispatchers?.length}>
            {results.dispatchers?.map((d: any) => (
              <div key={d.id} className="search-result">
                <Link className="link" href={`/admin/dispatchers/${d.id}`}>
                  {d.name}
                </Link>
                <div className="mono muted" style={{ marginTop: 4 }}>
                  {d.phone}
                </div>
              </div>
            ))}
          </Section>

          <Section title="Vehicles" empty={!results.vehicles?.length}>
            {results.vehicles?.map((v: any) => (
              <div key={v.id} className="search-result">
                <Link className="link" href={`/admin/vehicles/${v.id}`}>
                  {[v.manufacturer, v.carModel, v.numberPlate].filter(Boolean).join(' · ') || v.id}
                </Link>
                <div className="muted" style={{ marginTop: 4 }}>
                  {v.location} · {v.dispatcher?.name}
                </div>
              </div>
            ))}
          </Section>
        </div>
      ) : null}
    </>
  );
}

function Section({ title, children, empty }: { title: string; children: ReactNode; empty: boolean }) {
  if (empty) return null;
  return (
    <div className="card">
      <div className="h2" style={{ marginBottom: 12 }}>
        {title}
      </div>
      <div className="stack">{children}</div>
    </div>
  );
}

export default function AdminSearchPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}
