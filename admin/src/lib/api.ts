import { getSession } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type AdminMetrics = {
  users: { total: number; blocked: number };
  drivers: { total: number; approved: number; blocked: number };
  vehicles: { total: number; approved: number; pending: number };
  bookings: { total: number; completed: number; active: number; pendingDriver: number };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || res.statusText, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
  loginAdmin: (username: string, password: string) =>
    request<{ token: string; role: 'ADMIN' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  metrics: () => request<AdminMetrics>('/admin/metrics'),

  listBookings: () => request<any[]>('/admin/bookings'),

  listDrivers: () => request<any[]>('/admin/drivers'),
  approveDriver: (id: string, isApproved: boolean) =>
    request<any>(`/admin/drivers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),
  blockDriver: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/drivers/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),

  listVehicles: () => request<any[]>('/admin/vehicles'),
  approveVehicle: (id: string, isApproved: boolean) =>
    request<any>(`/admin/vehicles/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),

  listUsers: () => request<any[]>('/admin/users'),
  blockUser: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/users/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),
};

