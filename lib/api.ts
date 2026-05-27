import axios, { AxiosError, type AxiosRequestConfig, type RawAxiosRequestHeaders } from 'axios';

import { API_BASE_URL } from '@/lib/config';

export type ApiRequestOptions = Omit<AxiosRequestConfig, 'data' | 'url'> & {
  body?: unknown;
  token?: string;
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | undefined;

export function setAccessToken(token?: string) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

type AccessTokenRefreshHandler = () => Promise<string | undefined>;

let accessTokenRefreshHandler: AccessTokenRefreshHandler | undefined;

export function setAccessTokenRefreshHandler(handler?: AccessTokenRefreshHandler) {
  accessTokenRefreshHandler = handler;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  const requestBaseURL = options.baseURL ?? API_BASE_URL;

  if (!requestBaseURL) {
    throw new ApiError('API base URL is not configured. Mock API should handle this request.', 0, 'MOCK_API');
  }

  const { body, token: optionToken, skipAuth = false, headers: optionHeaders, ...axiosOptions } = options;
  const headers: RawAxiosRequestHeaders = {
    ...(optionHeaders as RawAxiosRequestHeaders | undefined),
  };
  const token = skipAuth ? undefined : optionToken ?? accessToken;

  if (body !== undefined && !hasHeader(headers, 'Content-Type')) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !hasHeader(headers, 'Authorization')) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestConfig: AxiosRequestConfig = {
    ...axiosOptions,
    baseURL: requestBaseURL,
    url: path,
    headers,
    data: body,
  };

  try {
    const response = await apiClient.request<TResponse>(requestConfig);
    return response.data;
  } catch (error) {
    if (shouldRefreshAccessToken(error, skipAuth)) {
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        const retryHeaders: RawAxiosRequestHeaders = {
          ...(requestConfig.headers as RawAxiosRequestHeaders | undefined),
          Authorization: `Bearer ${refreshedToken}`,
        };

        try {
          const retryResponse = await apiClient.request<TResponse>({
            ...requestConfig,
            headers: retryHeaders,
          });

          return retryResponse.data;
        } catch (retryError) {
          throw normalizeApiError(retryError);
        }
      }
    }

    throw normalizeApiError(error);
  }
}

function hasHeader(headers: RawAxiosRequestHeaders, name: string) {
  const normalizedName = name.toLowerCase();

  return Object.keys(headers).some((headerName) => headerName.toLowerCase() === normalizedName);
}

function normalizeApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosError(error);
  }

  if (error instanceof Error) {
    return error;
  }

  return new ApiError('Request failed');
}

function shouldRefreshAccessToken(error: unknown, skipAuth: boolean) {
  return Boolean(
    !skipAuth &&
    accessTokenRefreshHandler &&
    axios.isAxiosError(error) &&
    error.response?.status === 401,
  );
}

async function refreshAccessToken() {
  try {
    return accessTokenRefreshHandler?.();
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function normalizeAxiosError(error: AxiosError<unknown>) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message =
    getApiErrorMessage(data) ??
    (status ? `Request failed with status ${status}` : error.message || 'Network request failed');

  return new ApiError(message, status ?? 0, getApiErrorCode(data));
}

function getApiErrorMessage(data: unknown) {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (!isRecord(data)) {
    return undefined;
  }

  const directMessage = getStringValue(data.message);

  if (directMessage) {
    return directMessage;
  }

  const errorValue = data.error;

  if (typeof errorValue === 'string' && errorValue.trim()) {
    return errorValue;
  }

  if (isRecord(errorValue)) {
    return (
      getStringValue(errorValue.message) ??
      getStringValue(errorValue.error) ??
      getStringValue(errorValue.title)
    );
  }

  return undefined;
}

function getApiErrorCode(data: unknown) {
  if (!isRecord(data)) {
    return undefined;
  }

  const directCode = getStringValue(data.code);

  if (directCode) {
    return directCode;
  }

  if (isRecord(data.error)) {
    return getStringValue(data.error.code);
  }

  return undefined;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
