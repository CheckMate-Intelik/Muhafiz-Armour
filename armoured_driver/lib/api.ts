import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = resolveApiBaseUrl();

type DriverSession = {
  driverId: string;
  phone?: string;
  name?: string;
  email?: string;
};

let session: DriverSession | null = null;
let sessionPromise: Promise<DriverSession> | null = null;

const STORAGE_KEY = 'armoured:driver-session:v1';

export async function getStoredDriverSession(): Promise<DriverSession | null> {
  const raw = await safeGetItem(STORAGE_KEY);
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
    await safeRemoveItem(STORAGE_KEY);
    session = null;
    return;
  }
  await safeSetItem(STORAGE_KEY, JSON.stringify(next));
  session = next;
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

export async function ensureDriverSession(): Promise<DriverSession> {
  if (session) return session;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const stored = await getStoredDriverSession();
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

export async function driverGet<T>(path: string, driverId: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-driver-id': driverId },
  });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

export async function driverPost<T>(path: string, driverId: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-driver-id': driverId },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed`);
  return (await res.json()) as T;
}

export async function driverPatch<T>(path: string, driverId: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-driver-id': driverId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed`);
  return (await res.json()) as T;
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

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older manifests
    (Constants as any).manifest?.hostUri ??
    // Newer manifests
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') return `http://${host}:3001`;
  }

  return 'http://localhost:3001';
}

