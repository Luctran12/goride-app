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

  try {
    const response = await apiClient.request<TResponse>({
      ...axiosOptions,
      baseURL: requestBaseURL,
      url: path,
      headers,
      data: body,
    });

    return response.data;
  } catch (error) {
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

function normalizeAxiosError(error: AxiosError<ApiErrorBody>) {
  const status = error.response?.status;
  const data = error.response?.data;
  const message =
    data?.message ??
    data?.error ??
    (status ? `Request failed with status ${status}` : error.message || 'Network request failed');

  return new ApiError(message, status ?? 0, data?.code);
}

type ApiErrorBody = {
  message?: string;
  error?: string;
  code?: string;
};
