import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { ApiError, apiRequest, setAccessToken } from '@/lib/api';
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

type ApiResponse<TData> = {
  data?: TData;
  message?: string;
  success?: boolean;
  timestamp?: string;
};

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
    return undefined;
  }

  setAccessToken(accessToken);

  const refreshToken = (await getStoredValue(REFRESH_TOKEN_KEY)) ?? '';
  const userIdValue = await getStoredValue(USER_ID_KEY);
  const rolesValue = await getStoredValue(ROLES_KEY);

  return {
    accessToken,
    refreshToken,
    userId: Number(userIdValue ?? 0),
    roles: parseStoredRoles(rolesValue),
  };
}

export async function clearAuthSession() {
  setAccessToken(undefined);
  await Promise.all([
    deleteStoredValue(ACCESS_TOKEN_KEY),
    deleteStoredValue(REFRESH_TOKEN_KEY),
    deleteStoredValue(USER_ID_KEY),
    deleteStoredValue(ROLES_KEY),
  ]);
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
