import { clearSession } from './session';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type AdminMetrics = {
  users: { total: number; blocked: number };
  dispatchers: { total: number; approved: number; blocked: number };
  vehicles: { total: number; approved: number; pending: number };
  bookings: { total: number; completed: number; active: number; pendingDispatcher: number };
};

async function readResponse<T>(res: Response): Promise<T> {
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
    }
    throw new ApiError(text || res.statusText, res.status);
  }
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Invalid JSON response', res.status);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const proxyPath = `/api/admin${path.replace(/^\/admin/, '')}`;
  const res = await fetch(proxyPath, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  return readResponse<T>(res);
}

export const api = {
  loginAdmin: async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store',
    });
    return readResponse<{ role: 'ADMIN' }>(res);
  },

  metrics: () => request<AdminMetrics>('/admin/metrics'),

  listBookings: () => request<any[]>('/admin/bookings'),
  getBooking: (id: string) => request<any>(`/admin/bookings/lookup?id=${encodeURIComponent(id)}`),

  listDispatchers: () => request<any[]>('/admin/dispatchers'),
  getDispatcher: (id: string) => request<any>(`/admin/dispatchers/lookup?id=${encodeURIComponent(id)}`),
  approveDispatcher: (id: string, isApproved: boolean) =>
    request<any>(`/admin/dispatchers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),
  blockDispatcher: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/dispatchers/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),

  listVehicles: () => request<any[]>('/admin/vehicles'),
  getVehicle: (id: string) => request<any>(`/admin/vehicles/lookup?id=${encodeURIComponent(id)}`),
  approveVehicle: (id: string, isApproved: boolean) =>
    request<any>(`/admin/vehicles/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),
  updateVehicle: (id: string, body: Record<string, unknown>) =>
    request<any>(`/admin/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

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
