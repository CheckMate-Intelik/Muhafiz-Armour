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

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new ApiError(text || res.statusText, res.status);
  }
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Invalid JSON response', res.status);
  }
}

export const api = {
  loginAdmin: (username: string, password: string) =>
    request<{ token: string; role: 'ADMIN' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  metrics: () => request<AdminMetrics>('/admin/metrics'),

  listBookings: () => request<any[]>('/admin/bookings'),
  getBooking: (id: string) => request<any>(`/admin/bookings/lookup?id=${encodeURIComponent(id)}`),

  listDrivers: () => request<any[]>('/admin/drivers'),
  getDriver: (id: string) => request<any>(`/admin/drivers/lookup?id=${encodeURIComponent(id)}`),
  approveDriver: (id: string, isApproved: boolean) =>
    request<any>(`/admin/drivers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),
  blockDriver: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/drivers/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),

  listVehicles: () => request<any[]>('/admin/vehicles'),
  getVehicle: (id: string) => request<any>(`/admin/vehicles/lookup?id=${encodeURIComponent(id)}`),
  approveVehicle: (id: string, isApproved: boolean) =>
    request<any>(`/admin/vehicles/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),

  listUsers: () => request<any[]>('/admin/users'),
  getUser: (id: string) => request<any>(`/admin/users/lookup?id=${encodeURIComponent(id)}`),
  blockUser: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/users/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),

  listArmourLevelOptions: () => request<any[]>('/admin/armour-level-options'),
  createArmourLevelOption: (body: { code: string; label: string; sortOrder?: number; isActive?: boolean }) =>
    request<any>('/admin/armour-level-options', { method: 'POST', body: JSON.stringify(body) }),
  updateArmourLevelOption: (id: string, body: { label?: string; sortOrder?: number; isActive?: boolean }) =>
    request<any>(`/admin/armour-level-options/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteArmourLevelOption: (id: string) => request<any>(`/admin/armour-level-options/${id}`, { method: 'DELETE' }),

  listVehicleTypeOptions: () => request<any[]>('/admin/vehicle-type-options'),
  createVehicleTypeOption: (body: { code: string; label: string; sortOrder?: number; isActive?: boolean }) =>
    request<any>('/admin/vehicle-type-options', { method: 'POST', body: JSON.stringify(body) }),
  updateVehicleTypeOption: (id: string, body: { label?: string; sortOrder?: number; isActive?: boolean }) =>
    request<any>(`/admin/vehicle-type-options/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteVehicleTypeOption: (id: string) => request<any>(`/admin/vehicle-type-options/${id}`, { method: 'DELETE' }),
};

