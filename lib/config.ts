const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const appConfig = {
  apiBaseUrl: readEnv(process.env.EXPO_PUBLIC_API_BASE_URL),
  wsUrl: readEnv(process.env.EXPO_PUBLIC_WS_URL),
  googleMapsApiKey: readEnv(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY),
};

export const API_BASE_URL = appConfig.apiBaseUrl ? trimTrailingSlash(appConfig.apiBaseUrl) : undefined;
export const WS_URL = appConfig.wsUrl;
export const GOOGLE_MAPS_API_KEY = appConfig.googleMapsApiKey;
export const USE_MOCK_API = !API_BASE_URL;
export const USE_MOCK_REALTIME = !WS_URL;
export const HAS_GOOGLE_MAPS_API_KEY = Boolean(GOOGLE_MAPS_API_KEY);

