export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'PENDING'
      ? 'badge badge-yellow'
      : status === 'CONFIRMED'
        ? 'badge badge-green'
        : status === 'REJECTED'
          ? 'badge badge-red'
          : status === 'IN_PROGRESS'
            ? 'badge badge-blue'
            : 'badge badge-gray';

  const label = status
    .split('_')
    .map((s: string) => s.slice(0, 1) + s.slice(1).toLowerCase())
    .join(' ');

  return <span className={cls}>{label}</span>;
}

