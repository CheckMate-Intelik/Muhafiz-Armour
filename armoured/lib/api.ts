import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEPLOYED_API_URL = 'https://muhafiz-armour.vercel.app';
const API_BASE_URL = resolveApiBaseUrl();
export const PUBLIC_API_BASE_URL = API_BASE_URL;

type UserSession = {
  userId: string;
  phone?: string;
  name?: string;
  email?: string;
};

type DriverSession = {
  driverId: string;
  phone?: string;
  name?: string;
  email?: string;
};

export type AppRole = 'USER' | 'DRIVER';

let session: UserSession | null = null;
let sessionPromise: Promise<UserSession> | null = null;
let driverSession: DriverSession | null = null;
let driverSessionPromise: Promise<DriverSession> | null = null;

const STORAGE_KEY = 'armoured:user-session:v1';
const DRIVER_STORAGE_KEY = 'armoured:driver-session:v1';
const ACTIVE_ROLE_KEY = 'armoured:active-role:v1';

export async function getStoredUserSession(): Promise<UserSession | null> {
  const raw = await safeGetItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (typeof parsed.userId !== 'string' || parsed.userId.trim().length === 0) return null;
    return {
      userId: parsed.userId,
      phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function setStoredUserSession(next: UserSession | null) {
  if (!next) {
    await safeRemoveItem(STORAGE_KEY);
    session = null;
    return;
  }
  await safeSetItem(STORAGE_KEY, JSON.stringify(next));
  session = next;
}

export async function getStoredDriverSession(): Promise<DriverSession | null> {
  const raw = await safeGetItem(DRIVER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DriverSession>;
    if (typeof parsed.driverId !== 'string' || parsed.driverId.trim().length === 0) return null;
    return {
      driverId: parsed.driverId,
      phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function setStoredDriverSession(next: DriverSession | null) {
  if (!next) {
    await safeRemoveItem(DRIVER_STORAGE_KEY);
    driverSession = null;
    return;
  }
  await safeSetItem(DRIVER_STORAGE_KEY, JSON.stringify(next));
  driverSession = next;
}

export async function loginUser(input: { phone?: string; name?: string; email?: string; password?: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'User').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'USER',
      email: input.email,
      password: input.password,
      phone,
      name,
    }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Login failed');
  }
  const data = (await res.json()) as { user?: { id?: string } };
  const userId = data.user?.id;
  if (!userId) throw new Error('Missing user id');
  const next: UserSession = { userId, phone, name, email: input.email };
  await setStoredUserSession(next);
  return next;
}

export async function signupUser(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'User').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'USER',
      phone,
      name,
      email: input.email,
      password: input.password,
    }),
  });

  if (!res.ok) {
    const details = await safeReadError(res);
    if (res.status === 409) throw new Error(details ?? 'Account already exists');
    throw new Error(details ?? 'Account creation failed');
  }

  const data = (await res.json()) as { user?: { id?: string } };
  const userId = data.user?.id;
  if (!userId) throw new Error('Missing user id');
  const next: UserSession = { userId, phone, name, email: input.email };
  await setStoredUserSession(next);
  return next;
}

export async function loginDriver(input: { phone?: string; name?: string; email?: string; password?: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Driver').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DRIVER',
      email: input.email,
      password: input.password,
      phone,
      name,
    }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Login failed');
  }
  const data = (await res.json()) as { driver?: { id?: string } };
  const driverId = data.driver?.id;
  if (!driverId) throw new Error('Missing driver id');
  const next: DriverSession = { driverId, phone, name, email: input.email };
  await setStoredDriverSession(next);
  return next;
}

export async function signupDriver(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Driver').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DRIVER',
      phone,
      name,
      email: input.email,
      password: input.password,
    }),
  });

  if (!res.ok) {
    const details = await safeReadError(res);
    if (res.status === 409) throw new Error(details ?? 'Account already exists');
    throw new Error(details ?? 'Account creation failed');
  }

  const data = (await res.json()) as { driver?: { id?: string } };
  const driverId = data.driver?.id;
  if (!driverId) throw new Error('Missing driver id');
  const next: DriverSession = { driverId, phone, name, email: input.email };
  await setStoredDriverSession(next);
  return next;
}

export async function ensureUserSession(): Promise<UserSession> {
  if (session) return session;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const stored = await getStoredUserSession();
    if (stored) {
      session = stored;
      return stored;
    }
    throw new Error('Not authenticated');
  })();

  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

export async function ensureDriverSession(): Promise<DriverSession> {
  if (driverSession) return driverSession;
  if (driverSessionPromise) return driverSessionPromise;

  driverSessionPromise = (async () => {
    const stored = await getStoredDriverSession();
    if (stored) {
      driverSession = stored;
      return stored;
    }
    throw new Error('Not authenticated');
  })();

  try {
    return await driverSessionPromise;
  } finally {
    driverSessionPromise = null;
  }
}

export async function apiGet<T>(path: string, userId: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-user-id': userId },
  });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, userId: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, userId: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-user-id': userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed`);
  return (await res.json()) as T;
}

export async function driverGet<T>(path: string, driverId: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-driver-id': driverId },
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `GET ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function driverPost<T>(path: string, driverId: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-driver-id': driverId },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `POST ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function driverPatch<T>(path: string, driverId: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-driver-id': driverId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `PATCH ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function getActiveRole(): Promise<AppRole> {
  const stored = await safeGetItem(ACTIVE_ROLE_KEY);
  return stored === 'DRIVER' ? 'DRIVER' : 'USER';
}

export async function setActiveRole(role: AppRole) {
  await safeSetItem(ACTIVE_ROLE_KEY, role);
}

async function safeGetItem(key: string) {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function safeSetItem(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (e.g. native module missing).
  }
}

async function safeRemoveItem(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore storage failures (e.g. native module missing).
  }
}

async function safeReadError(res: Response) {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    const msg = Array.isArray(data.message) ? data.message.join('\n') : data.message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg.trim();
    return null;
  } catch {
    return null;
  }
}

function resolveApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv.trim();
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.hostUri ?? (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') return `http://${host}:3001`;
  }
  return DEPLOYED_API_URL;
}

