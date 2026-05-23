import { API_BASE_URL } from '@/lib/config';

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
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

export async function apiRequest<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new ApiError('API base URL is not configured. Mock API should handle this request.', 0, 'MOCK_API');
  }

  const headers = new Headers(options.headers);
  const token = options.token ?? accessToken;

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = parseResponseBody(text);

  if (!response.ok) {
    const message = data?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data?.code);
  }

  return data as TResponse;
}

function parseResponseBody(text: string) {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
