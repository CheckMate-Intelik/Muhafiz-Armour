import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import { emailValidationMessage, normalizeEmail } from '@/lib/emailValidation';

const DEPLOYED_API_URL = 'https://muhafiz-armour.vercel.app';
const API_BASE_URL = resolveApiBaseUrl();
export const PUBLIC_API_BASE_URL = API_BASE_URL;

/** Unauthenticated GET for public catalog endpoints. */
export async function publicGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);
  if (res.status === 401 && requestHasAuthHeader(init?.headers)) {
    session = null;
    dispatcherSession = null;
    await clearAllStoredSessions();
  }
  return res;
}

function requestHasAuthHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has('Authorization');
  if (Array.isArray(headers)) return headers.some(([k]) => k.toLowerCase() === 'authorization');
  return 'Authorization' in headers || 'authorization' in headers;
}

type UserSession = {
  userId: string;
  token: string;
  phone?: string;
  name?: string;
  email?: string;
};

type DispatcherSession = {
  dispatcherId: string;
  token: string;
  phone?: string;
  name?: string;
  email?: string;
};

export type AppRole = 'USER' | 'DISPATCHER';

let session: UserSession | null = null;
let sessionPromise: Promise<UserSession> | null = null;
let dispatcherSession: DispatcherSession | null = null;
let dispatcherSessionPromise: Promise<DispatcherSession> | null = null;

const USER_SECURE_KEY = 'armoured:user-session:v2';
const DISPATCHER_SECURE_KEY = 'armoured:dispatcher-session:v2';
const ACTIVE_ROLE_KEY = 'armoured:active-role:v1';

export async function getStoredUserSession(): Promise<UserSession | null> {
  const raw = await secureGetItem(USER_SECURE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (typeof parsed.userId !== 'string' || parsed.userId.trim().length === 0) return null;
    if (typeof parsed.token !== 'string' || parsed.token.trim().length === 0) return null;
    return {
      userId: parsed.userId,
      token: parsed.token,
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
    await secureRemoveItem(USER_SECURE_KEY);
    session = null;
    return;
  }
  const existing = session ?? (await getStoredUserSession());
  const merged: UserSession = {
    userId: next.userId,
    token: next.token ?? existing?.token ?? '',
    phone: next.phone ?? existing?.phone,
    name: next.name ?? existing?.name,
    email: next.email ?? existing?.email,
  };
  if (!merged.token.trim()) {
    throw new Error('Not authenticated');
  }
  await secureSetItem(USER_SECURE_KEY, JSON.stringify(merged));
  session = merged;
}

export async function getStoredDispatcherSession(): Promise<DispatcherSession | null> {
  const raw = await secureGetItem(DISPATCHER_SECURE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DispatcherSession>;
    if (typeof parsed.dispatcherId !== 'string' || parsed.dispatcherId.trim().length === 0) return null;
    if (typeof parsed.token !== 'string' || parsed.token.trim().length === 0) return null;
    return {
      dispatcherId: parsed.dispatcherId,
      token: parsed.token,
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
    await secureRemoveItem(DISPATCHER_SECURE_KEY);
    dispatcherSession = null;
    return;
  }
  const existing = dispatcherSession ?? (await getStoredDispatcherSession());
  const merged: DispatcherSession = {
    dispatcherId: next.dispatcherId,
    token: next.token ?? existing?.token ?? '',
    phone: next.phone ?? existing?.phone,
    name: next.name ?? existing?.name,
    email: next.email ?? existing?.email,
  };
  if (!merged.token.trim()) {
    throw new Error('Not authenticated');
  }
  await secureSetItem(DISPATCHER_SECURE_KEY, JSON.stringify(merged));
  dispatcherSession = merged;
}

/** Clears user and dispatcher sessions from storage and in-memory caches. */
export async function clearAllStoredSessions() {
  await Promise.all([setStoredUserSession(null), setStoredDispatcherSession(null)]);
}

function assertValidEmail(emailInput: string | undefined) {
  const message = emailValidationMessage(emailInput ?? '');
  if (message) throw new Error(message);
  return normalizeEmail(emailInput ?? '');
}

export async function requestPasswordReset(input: { email: string; role: AppRole }) {
  const email = assertValidEmail(input.email);
  const res = await apiFetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, role: input.role }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Could not send verification code');
  }
  return (await res.json()) as { ok: boolean; message: string };
}

export async function resetPasswordWithCode(input: {
  email: string;
  role: AppRole;
  code: string;
  password: string;
}) {
  const email = assertValidEmail(input.email);
  const code = input.code.trim();
  if (code.length < 6) throw new Error('Enter the 6-digit verification code');
  if (!input.password || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const res = await apiFetch('/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      role: input.role,
      code,
      password: input.password,
    }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Could not reset password');
  }
  return (await res.json()) as { ok: boolean; message: string };
}

export async function loginUser(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = assertValidEmail(input.email);
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'User').trim();
  if (!input.password?.trim()) throw new Error('Password is required');

  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'USER',
      email,
      password: input.password,
      phone,
      name,
    }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Login failed');
  }
  const data = (await res.json()) as { token?: string; user?: { id?: string } };
  const userId = data.user?.id;
  const token = data.token;
  if (!userId || !token) throw new Error('Invalid login response');
  const next: UserSession = { userId, token, phone, name, email };
  await setStoredUserSession(next);
  return next;
}

export async function signupUser(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = assertValidEmail(input.email);
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'User').trim();
  if (!phone) throw new Error('Phone is required');
  if (!input.password?.trim()) throw new Error('Password is required');

  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'USER',
      phone,
      name,
      email,
      password: input.password,
    }),
  });

  if (!res.ok) {
    const details = await safeReadError(res);
    if (res.status === 409) throw new Error(details ?? 'Account already exists');
    throw new Error(details ?? 'Account creation failed');
  }

  const data = (await res.json()) as { token?: string; user?: { id?: string } };
  const userId = data.user?.id;
  const token = data.token;
  if (!userId || !token) throw new Error('Invalid signup response');
  const next: UserSession = { userId, token, phone, name, email };
  await setStoredUserSession(next);
  return next;
}

export async function loginDispatcher(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = assertValidEmail(input.email);
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Dispatcher').trim();
  if (!input.password?.trim()) throw new Error('Password is required');

  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DISPATCHER',
      email,
      password: input.password,
      phone,
      name,
    }),
  });
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Login failed');
  }
  const data = (await res.json()) as { token?: string; dispatcher?: { id?: string } };
  const dispatcherId = data.dispatcher?.id;
  const token = data.token;
  if (!dispatcherId || !token) throw new Error('Invalid login response');
  const next: DispatcherSession = { dispatcherId, token, phone, name, email };
  await setStoredDispatcherSession(next);
  return next;
}

export async function signupDispatcher(input: { phone?: string; name?: string; email?: string; password: string }) {
  const email = assertValidEmail(input.email);
  const phone = (input.phone?.trim() || email || '').trim();
  const name = (input.name?.trim() || 'Dispatcher').trim();
  if (!phone) throw new Error('Phone is required');
  if (!input.password?.trim()) throw new Error('Password is required');

  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: 'DISPATCHER',
      phone,
      name,
      email,
      password: input.password,
    }),
  });

  if (!res.ok) {
    const details = await safeReadError(res);
    if (res.status === 409) throw new Error(details ?? 'Account already exists');
    throw new Error(details ?? 'Account creation failed');
  }

  const data = (await res.json()) as { token?: string; dispatcher?: { id?: string } };
  const dispatcherId = data.dispatcher?.id;
  const token = data.token;
  if (!dispatcherId || !token) throw new Error('Invalid signup response');
  const next: DispatcherSession = { dispatcherId, token, phone, name, email };
  await setStoredDispatcherSession(next);
  return next;
}

export async function ensureUserSession(): Promise<UserSession> {
  if (session?.token) return session;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const stored = await getStoredUserSession();
    if (stored?.token) {
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
  if (dispatcherSession?.token) return dispatcherSession;
  if (dispatcherSessionPromise) return dispatcherSessionPromise;

  dispatcherSessionPromise = (async () => {
    const stored = await getStoredDispatcherSession();
    if (stored?.token) {
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

async function userAuthHeaders(userId: string) {
  const s = await ensureUserSession();
  if (s.userId !== userId) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${s.token}` };
}

async function dispatcherAuthHeaders(dispatcherId: string) {
  const s = await ensureDispatcherSession();
  if (s.dispatcherId !== dispatcherId) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${s.token}` };
}

export async function apiGet<T>(path: string, userId: string): Promise<T> {
  const res = await apiFetch(path, {
    headers: await userAuthHeaders(userId),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, userId: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await userAuthHeaders(userId)) },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `POST ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string, userId: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...(await userAuthHeaders(userId)) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `DELETE ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, userId: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(await userAuthHeaders(userId)) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
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
  const res = await apiFetch('/media/upload/profile', {
    method: 'POST',
    headers: await userAuthHeaders(userId),
    body: form,
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Profile image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherUploadVehicleImage(dispatcherId: string, fileUri: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, type: guessImageMime(fileUri), name: 'vehicle.jpg' } as unknown as Blob);
  const res = await apiFetch('/media/upload/vehicle', {
    method: 'POST',
    headers: await dispatcherAuthHeaders(dispatcherId),
    body: form,
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Vehicle image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherUploadProfileImage(dispatcherId: string, fileUri: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, type: guessImageMime(fileUri), name: 'profile.jpg' } as unknown as Blob);
  const res = await apiFetch('/media/upload/profile', {
    method: 'POST',
    headers: await dispatcherAuthHeaders(dispatcherId),
    body: form,
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? 'Profile image upload failed');
  }
  return (await res.json()) as { url: string };
}

export async function dispatcherGet<T>(path: string, dispatcherId: string): Promise<T> {
  const res = await apiFetch(path, {
    headers: await dispatcherAuthHeaders(dispatcherId),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `GET ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function dispatcherPost<T>(path: string, dispatcherId: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await dispatcherAuthHeaders(dispatcherId)) },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `POST ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function dispatcherDelete<T>(path: string, dispatcherId: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', ...(await dispatcherAuthHeaders(dispatcherId)) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
  if (!res.ok) {
    const details = await safeReadError(res);
    throw new Error(details ?? `DELETE ${path} failed`);
  }
  return (await res.json()) as T;
}

export async function dispatcherPatch<T>(path: string, dispatcherId: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(await dispatcherAuthHeaders(dispatcherId)) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Not authenticated');
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

async function secureGetItem(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return safeGetItem(key);
  }
}

async function secureSetItem(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await safeSetItem(key, value);
  }
}

async function secureRemoveItem(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await safeRemoveItem(key);
  }
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
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    const url = fromEnv.trim();
    assertHttpsInProduction(url);
    return url;
  }
  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as { manifest?: { hostUri?: string } }).manifest?.hostUri ??
      (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2?.extra
        ?.expoClient?.hostUri;
    if (typeof hostUri === 'string' && hostUri.length > 0) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost') return `http://${host}:3001`;
    }
  }
  return DEPLOYED_API_URL;
}

function assertHttpsInProduction(url: string) {
  if (__DEV__) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new Error('EXPO_PUBLIC_API_URL must use HTTPS in production builds');
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('HTTPS')) throw e;
    throw new Error('EXPO_PUBLIC_API_URL must be a valid HTTPS URL in production builds');
  }
}
