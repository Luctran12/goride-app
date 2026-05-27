import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { ApiError, apiRequest, setAccessToken, setAccessTokenRefreshHandler } from '@/lib/api';
import { AUTH_API_BASE_URL, USE_MOCK_AUTH_API } from '@/lib/config';

const ACCESS_TOKEN_KEY = 'goride.auth.accessToken';
const REFRESH_TOKEN_KEY = 'goride.auth.refreshToken';
const USER_ID_KEY = 'goride.auth.userId';
const ROLES_KEY = 'goride.auth.roles';

export type AuthRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';

export type LoginRequest = {
  phone: string;
  password: string;
};

export type RegisterRequest = {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  roles: AuthRole[];
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  roles: AuthRole[];
  userId: number;
};

export type AuthSession = AuthResponse;

type AuthSessionListener = (session: AuthSession | undefined) => void;

type ApiResponse<TData> = {
  data?: TData;
  message?: string;
  success?: boolean;
  timestamp?: string;
};

const authSessionListeners = new Set<AuthSessionListener>();
let refreshSessionPromise: Promise<AuthSession> | undefined;

setAccessTokenRefreshHandler(async () => {
  const session = await refreshAuthSession();
  return session.accessToken;
});

export function subscribeAuthSession(listener: AuthSessionListener) {
  authSessionListeners.add(listener);

  return () => {
    authSessionListeners.delete(listener);
  };
}

export async function login(payload: LoginRequest) {
  const session = USE_MOCK_AUTH_API ? await mockLogin(payload) : await requestAuth('/auth/login', payload);
  await saveAuthSession(session);

  return session;
}

export async function registerPassenger(payload: Omit<RegisterRequest, 'roles'>) {
  const request: RegisterRequest = {
    ...payload,
    roles: ['PASSENGER'],
  };
  const session = USE_MOCK_AUTH_API ? await mockRegister(request) : await requestAuth('/auth/register', request);
  await saveAuthSession(session);

  return session;
}

export async function logout() {
  const refreshToken = await getStoredValue(REFRESH_TOKEN_KEY);

  try {
    if (refreshToken && !USE_MOCK_AUTH_API) {
      await apiRequest<ApiResponse<void>>('/auth/logout', {
        baseURL: AUTH_API_BASE_URL,
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
      });
    }
  } catch {
    // Local session cleanup must still succeed if the backend session is already expired.
  } finally {
    await clearAuthSession();
  }
}

export async function initializeAuthSession() {
  const accessToken = await getStoredValue(ACCESS_TOKEN_KEY);

  if (!accessToken) {
    setAccessToken(undefined);
    notifyAuthSession(undefined);
    return undefined;
  }

  if (isAccessTokenExpired(accessToken)) {
    try {
      return await refreshAuthSession();
    } catch {
      return undefined;
    }
  }

  setAccessToken(accessToken);

  const refreshToken = (await getStoredValue(REFRESH_TOKEN_KEY)) ?? '';
  const userIdValue = await getStoredValue(USER_ID_KEY);
  const rolesValue = await getStoredValue(ROLES_KEY);

  const session = {
    accessToken,
    refreshToken,
    userId: Number(userIdValue ?? 0),
    roles: parseStoredRoles(rolesValue),
  };

  notifyAuthSession(session);

  return session;
}

export async function clearAuthSession() {
  setAccessToken(undefined);
  await Promise.all([
    deleteStoredValue(ACCESS_TOKEN_KEY),
    deleteStoredValue(REFRESH_TOKEN_KEY),
    deleteStoredValue(USER_ID_KEY),
    deleteStoredValue(ROLES_KEY),
  ]);
  notifyAuthSession(undefined);
}

export async function refreshAuthSession() {
  if (!refreshSessionPromise) {
    refreshSessionPromise = refreshAuthSessionNow().finally(() => {
      refreshSessionPromise = undefined;
    });
  }

  return refreshSessionPromise;
}

async function requestAuth(path: string, payload: LoginRequest | RegisterRequest) {
  const response = await apiRequest<ApiResponse<AuthResponse>>(path, {
    baseURL: AUTH_API_BASE_URL,
    method: 'POST',
    body: payload,
    skipAuth: true,
  });

  return unwrapAuthResponse(response);
}

async function refreshAuthSessionNow() {
  const refreshToken = await getStoredValue(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    await clearAuthSession();
    throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401, 'AUTH_EXPIRED');
  }

  try {
    const session = USE_MOCK_AUTH_API ? createMockAuthSession() : await requestRefresh(refreshToken);
    await saveAuthSession(session);

    return session;
  } catch (error) {
    await clearAuthSession();
    throw error;
  }
}

async function requestRefresh(refreshToken: string) {
  const response = await apiRequest<ApiResponse<AuthResponse>>('/auth/refresh', {
    baseURL: AUTH_API_BASE_URL,
    method: 'POST',
    body: { refreshToken },
    skipAuth: true,
  });

  return unwrapAuthResponse(response);
}

function unwrapAuthResponse(response: ApiResponse<AuthResponse>) {
  if (response.success === false) {
    throw new ApiError(response.message ?? 'Authentication request failed');
  }

  if (!response.data?.accessToken || !response.data.refreshToken) {
    throw new ApiError(response.message ?? 'Authentication response did not include tokens');
  }

  return response.data;
}

async function saveAuthSession(session: AuthSession) {
  setAccessToken(session.accessToken);

  await Promise.all([
    setStoredValue(ACCESS_TOKEN_KEY, session.accessToken),
    setStoredValue(REFRESH_TOKEN_KEY, session.refreshToken),
    setStoredValue(USER_ID_KEY, String(session.userId)),
    setStoredValue(ROLES_KEY, JSON.stringify(session.roles)),
  ]);
  notifyAuthSession(session);
}

function notifyAuthSession(session: AuthSession | undefined) {
  authSessionListeners.forEach((listener) => listener(session));
}

function parseStoredRoles(value: string | null) {
  if (!value) {
    return [] as AuthRole[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as AuthRole[]) : [];
  } catch {
    return [];
  }
}

function isAccessTokenExpired(token: string) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp || typeof payload.exp !== 'number') {
    return false;
  }

  return Date.now() >= payload.exp * 1000 - 30000;
}

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as { exp?: number };
  } catch {
    return undefined;
  }
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of padded.replace(/=+$/, '')) {
    const index = chars.indexOf(char);

    if (index < 0) {
      throw new Error('Invalid base64url value');
    }

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

async function getStoredValue(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

async function mockLogin(payload: LoginRequest): Promise<AuthSession> {
  if (!payload.phone.trim() || !payload.password.trim()) {
    throw new ApiError('Phone and password are required');
  }

  return createMockAuthSession();
}

async function mockRegister(payload: RegisterRequest): Promise<AuthSession> {
  if (!payload.fullName.trim() || !payload.phone.trim() || !payload.password.trim()) {
    throw new ApiError('Full name, phone, and password are required');
  }

  return createMockAuthSession();
}

function createMockAuthSession(): AuthSession {
  return {
    accessToken: `mock-access-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    roles: ['PASSENGER'],
    userId: 1,
  };
}
