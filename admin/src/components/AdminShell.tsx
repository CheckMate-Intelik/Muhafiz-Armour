'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useSessionIdleTimeout } from '@/hooks/useSessionIdleTimeout';

export function AdminShell({ children }: { children: ReactNode }) {
  useSessionIdleTimeout();

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-title">Armored Ops</div>
          <div className="muted">Admin dashboard</div>
        </div>

        <nav className="sidebar-nav">
          <Link className="sidebar-link" href="/admin">
            Dashboard
          </Link>
          <div className="sidebar-section-label">Operations</div>
          <Link className="sidebar-link" href="/admin/bookings">
            Bookings
          </Link>
          <Link className="sidebar-link" href="/admin/dispatchers">
            Dispatchers
          </Link>
          <Link className="sidebar-link" href="/admin/vehicles">
            Vehicles
          </Link>
          <Link className="sidebar-link" href="/admin/users">
            Users
          </Link>
          <div className="sidebar-section-label">Configuration</div>
          <Link className="sidebar-link" href="/admin/catalog">
            Catalog
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="muted">Governance only</div>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-container">{children}</div>
      </main>
    </div>
  );
}
