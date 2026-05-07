import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <Link className="sidebar-link" href="/admin/drivers">
            Drivers
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

