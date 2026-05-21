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

type DispatcherSession = {
  dispatcherId: string;
  phone?: string;
  name?: string;
  email?: string;
};

export type AppRole = 'USER' | 'DISPATCHER';

let session: UserSession | null = null;
let sessionPromise: Promise<UserSession> | null = null;
let dispatcherSession: DispatcherSession | null = null;
let dispatcherSessionPromise: Promise<DispatcherSession> | null = null;

const STORAGE_KEY = 'armoured:user-session:v1';
const DISPATCHER_STORAGE_KEY = 'armoured:dispatcher-session:v1';
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

export async function getStoredDispatcherSession(): Promise<DispatcherSession | null> {
  const raw = await safeGetItem(DISPATCHER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DispatcherSession>;
    if (typeof parsed.dispatcherId !== 'string' || parsed.dispatcherId.trim().length === 0) return null;
    return {
      dispatcherId: parsed.dispatcherId,
      phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function setStoredDispatcherSession(next: DispatcherSession | null) {
  if (!next) {
    await safeRemoveItem(DISPATCHER_STORAGE_KEY);
    dispatcherSession = null;
    return;
  }
  await safeSetItem(DISPATCHER_STORAGE_KEY, JSON.stringify(next));
  dispatcherSession = next;
}

/** Clears user and dispatcher sessions from storage and in-memory caches. */
export async function clearAllStoredSessions() {
  await Promise.all([setStoredUserSession(null), setStoredDispatcherSession(null)]);
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

export async function loginDispatcher(input: { phone?: string; name?: string; email?: string; password?: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Dispatcher').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DISPATCHER',
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
  const data = (await res.json()) as { dispatcher?: { id?: string } };
  const dispatcherId = data.dispatcher?.id;
  if (!dispatcherId) throw new Error('Missing dispatcher id');
  const next: DispatcherSession = { dispatcherId, phone, name, email: input.email };
  await setStoredDispatcherSession(next);
  return next;
}

export async function signupDispatcher(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = input.email?.trim();
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Dispatcher').trim();
  if (!phone) throw new Error('Missing identifier');

  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DISPATCHER',
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

  const data = (await res.json()) as { dispatcher?: { id?: string } };
  const dispatcherId = data.dispatcher?.id;
  if (!dispatcherId) throw new Error('Missing dispatcher id');
  const next: DispatcherSession = { dispatcherId, phone, name, email: input.email };
  await setStoredDispatcherSession(next);
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

export async function ensureDispatcherSession(): Promise<DispatcherSession> {
  if (dispatcherSession) return dispatcherSession;
  if (dispatcherSessionPromise) return dispatcherSessionPromise;

  dispatcherSessionPromise = (async () => {
    const stored = await getStoredDispatcherSession();
    if (stored) {
      dispatcherSession = stored;
      return stored;
    }
    throw new Error('Not authenticated');
  })();

  try {
    return await dispatcherSessionPromise;
  } finally {
    dispatcherSessionPromise = null;
  }
}

export function isNotAuthenticatedError(e: unknown): boolean {
  if (!e) return false;
  if (e instanceof Error) return e.message === 'Not authenticated';
  return false;
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
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `POST ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, userId: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-user-id': userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `PATCH ${path} failed`);
  }
  return (await res.json()) as T;
}

function guessImageMime(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

export async function apiUploadProfileImage(userId: string, fileUri: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, type: guessImageMime(fileUri), name: 'profile.jpg' } as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/media/upload/profile`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: form,
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Profile image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherUploadVehicleImage(dispatcherId: string, fileUri: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, type: guessImageMime(fileUri), name: 'vehicle.jpg' } as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/media/upload/vehicle`, {
    method: 'POST',
    headers: { 'x-dispatcher-id': dispatcherId },
    body: form,
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Vehicle image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherUploadProfileImage(dispatcherId: string, fileUri: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, type: guessImageMime(fileUri), name: 'profile.jpg' } as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/media/upload/profile`, {
    method: 'POST',
    headers: { 'x-dispatcher-id': dispatcherId },
    body: form,
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Profile image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherGet<T>(path: string, dispatcherId: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'x-dispatcher-id': dispatcherId },
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `GET ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function dispatcherPost<T>(path: string, dispatcherId: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dispatcher-id': dispatcherId },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `POST ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function dispatcherPatch<T>(path: string, dispatcherId: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-dispatcher-id': dispatcherId },
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
  return stored === 'DISPATCHER' ? 'DISPATCHER' : 'USER';
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

