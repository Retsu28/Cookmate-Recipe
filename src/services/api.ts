/**
 * Centralized API client for the CookMate web app.
 *
 * All calls go through the Express API backend.
 * In development, Vite proxies /api/* to the Express server.
 * In production, set VITE_API_BASE_URL to the EC2 API URL.
 */

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || '';
const AUTH_TOKEN_KEY = 'cookmate.auth.token';

let _refreshing: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json() as { token?: string };
      if (data?.token) {
        try { localStorage.setItem(AUTH_TOKEN_KEY, data.token); } catch { /* noop */ }
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

/**
 * Thin wrapper around fetch that:
 *  - prepends the API base URL
 *  - sets JSON content-type for non-GET requests
 *  - parses JSON responses
 *  - throws on non-OK status with the server error message
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* storage unavailable — continue without auth header */
  }

  // Auto-set JSON content type for requests with bodies (skip for FormData)
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach CSRF token for state-mutating requests (double-submit cookie pattern)
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers['X-CSRF-Token']) {
    try {
      const csrfCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('cookmate.csrf='))
        ?.split('=')[1];
      if (csrfCookie) headers['X-CSRF-Token'] = csrfCookie;
    } catch {
      /* non-browser environment — skip */
    }
  }

  const res = await fetch(url, { credentials: 'include', ...options, headers });

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    // Auto-refresh on 401 — skip for all /api/auth/* endpoints (me, refresh, login, etc.)
    // to avoid infinite loops on public pages or normal unauthenticated states
    if (res.status === 401 && !_isRetry && !endpoint.includes('/api/auth/')) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        return request<T>(endpoint, options, true);
      }
      // Refresh failed — clear stale token but do NOT force-redirect
      // (let the AuthGate / router handle navigation naturally)
      try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch { /* noop */ }
    }
    const msg =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    const error = new Error(msg) as Error & {
      data?: unknown;
      status?: number;
    };
    error.data = data;
    error.status = res.status;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
    init?: Omit<RequestInit, 'method' | 'body' | 'headers'>
  ) =>
    request<T>(endpoint, {
      ...init,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T = unknown>(
    endpoint: string,
    bodyOrHeaders?: unknown,
    headers?: Record<string, string>
  ) => {
    const looksLikeHeaders =
      bodyOrHeaders &&
      typeof bodyOrHeaders === 'object' &&
      !Array.isArray(bodyOrHeaders) &&
      ('Authorization' in bodyOrHeaders || 'authorization' in bodyOrHeaders);
    const body = looksLikeHeaders ? undefined : bodyOrHeaders;
    const requestHeaders = looksLikeHeaders ? (bodyOrHeaders as Record<string, string>) : headers;

    return request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
      headers: requestHeaders,
    });
  },

  patch: <T = unknown>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  // FormData methods for file uploads (don't set Content-Type, let browser set it with boundary)
  postFormData: <T = unknown>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with correct multipart boundary
    }),

  putFormData: <T = unknown>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: formData,
      // Don't set Content-Type header - browser will set it with correct multipart boundary
    }),
};

export default api;
