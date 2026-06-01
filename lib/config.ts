const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const readBooleanEnv = (value: string | undefined) => {
  const normalized = readEnv(value)?.toLowerCase();

  if (normalized === undefined) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const normalizeApiBaseUrl = (value: string) => {
  const trimmed = trimTrailingSlash(value);

  if (/\/api\/v\d+$/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}/api/v1`;
};

export const DEFAULT_BACKEND_ORIGIN = 'http://10.255.253.75:8080';
export const DEFAULT_AUTH_API_BASE_URL = normalizeApiBaseUrl(DEFAULT_BACKEND_ORIGIN);

export const appConfig = {
  apiBaseUrl: readEnv(process.env.EXPO_PUBLIC_API_BASE_URL),
  authApiBaseUrl: readEnv(process.env.EXPO_PUBLIC_AUTH_API_BASE_URL),
  useMockApi: readBooleanEnv(process.env.EXPO_PUBLIC_USE_MOCK_API),
  useMockAuthApi: readBooleanEnv(process.env.EXPO_PUBLIC_USE_MOCK_AUTH_API),
  wsUrl: readEnv(process.env.EXPO_PUBLIC_WS_URL),
  googleMapsApiKey: readEnv(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
};

export const API_BASE_URL = appConfig.apiBaseUrl ? normalizeApiBaseUrl(appConfig.apiBaseUrl) : undefined;
export const AUTH_API_BASE_URL = appConfig.authApiBaseUrl
  ? normalizeApiBaseUrl(appConfig.authApiBaseUrl)
  : API_BASE_URL ?? DEFAULT_AUTH_API_BASE_URL;
export const WS_URL = appConfig.wsUrl;
export const GOOGLE_MAPS_API_KEY = appConfig.googleMapsApiKey;
export const USE_MOCK_API = appConfig.useMockApi ?? !API_BASE_URL;
export const USE_MOCK_AUTH_API = appConfig.useMockAuthApi ?? false;
export const USE_MOCK_REALTIME = !WS_URL;
export const HAS_GOOGLE_MAPS_API_KEY = Boolean(GOOGLE_MAPS_API_KEY);

