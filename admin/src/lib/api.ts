import { clearSession } from './session';
import { toQueryString } from './query';

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

export type OperationsQueue = {
  pendingDispatchers: Array<{ id: string; name: string; phone: string; email: string | null; createdAt: string }>;
  pendingVehicles: Array<any>;
  expiringBookings: Array<any>;
  pendingExtensions: Array<any>;
  blockedUsersWithActivity: Array<{ id: string; name: string; phone: string; email: string | null }>;
  blockedDispatchersWithActivity: Array<{ id: string; name: string; phone: string; email: string | null }>;
  counts: Record<string, number>;
};

export type AuditPage<T> = { rows: T[]; total: number; take: number; skip: number };

export type BookingListFilters = {
  status?: string;
  startDate?: string;
  endDate?: string;
  pickupCity?: string;
  dropCity?: string;
  dispatcherId?: string;
  armourLevel?: string;
  isUnderReview?: string;
  q?: string;
};

export type DispatcherListFilters = {
  isApproved?: string;
  isBlocked?: string;
  q?: string;
};

export type VehicleListFilters = {
  isApproved?: string;
  city?: string;
  q?: string;
};

export type AuditFilters = {
  eventType?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: string;
  offset?: string;
  suspiciousOnly?: string;
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

  operationsQueue: () => request<OperationsQueue>('/admin/operations-queue'),

  globalSearch: (q: string) => request<any>(`/admin/search${toQueryString({ q })}`),

  listAdminAudit: (filters: AuditFilters = {}) =>
    request<AuditPage<any>>(`/admin/audit/admin${toQueryString(filters)}`),
  listAuthAudit: (filters: AuditFilters = {}) =>
    request<AuditPage<any>>(`/admin/audit/auth${toQueryString(filters)}`),
  listBookingAudit: (bookingId: string) => request<any[]>(`/admin/audit/bookings/${bookingId}`),

  listBookings: (filters: BookingListFilters = {}) =>
    request<any[]>(`/admin/bookings${toQueryString(filters)}`),
  getBooking: (id: string) => request<any>(`/admin/bookings/lookup?id=${encodeURIComponent(id)}`),
  forceCancelBooking: (id: string, reason: string) =>
    request<any>(`/admin/bookings/${id}/force-cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reassignBooking: (id: string, vehicleId: string, reason: string) =>
    request<any>(`/admin/bookings/${id}/reassign`, { method: 'POST', body: JSON.stringify({ vehicleId, reason }) }),
  extendDispatcherDeadline: (id: string, reason: string, extraMinutes?: number) =>
    request<any>(`/admin/bookings/${id}/extend-deadline`, {
      method: 'POST',
      body: JSON.stringify({ reason, ...(extraMinutes != null ? { extraMinutes } : {}) }),
    }),
  setBookingReview: (id: string, body: { isUnderReview: boolean; reason: string; note?: string }) =>
    request<any>(`/admin/bookings/${id}/review`, { method: 'PATCH', body: JSON.stringify(body) }),

  listDispatchers: (filters: DispatcherListFilters = {}) =>
    request<any[]>(`/admin/dispatchers${toQueryString(filters)}`),
  getDispatcher: (id: string) => request<any>(`/admin/dispatchers/lookup?id=${encodeURIComponent(id)}`),
  approveDispatcher: (id: string, isApproved: boolean) =>
    request<any>(`/admin/dispatchers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ isApproved }) }),
  blockDispatcher: (id: string, isBlocked: boolean) =>
    request<any>(`/admin/dispatchers/${id}/block`, { method: 'PATCH', body: JSON.stringify({ isBlocked }) }),

  listVehicles: (filters: VehicleListFilters = {}) =>
    request<any[]>(`/admin/vehicles${toQueryString(filters)}`),
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
