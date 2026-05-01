/**
 * Centralized API client for the CookMate web app.
 *
 * All calls go through the Express API backend.
 * In development, Vite proxies /api/* to the Express server.
 * In production, set VITE_API_BASE_URL to the EC2 API URL.
 */

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || '';

/**
 * Thin wrapper around fetch that:
 *  - prepends the API base URL
 *  - sets JSON content-type for non-GET requests
 *  - parses JSON responses
 *  - throws on non-OK status with the server error message
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Auto-set JSON content type for requests with bodies
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
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

  delete: <T = unknown>(endpoint: string, headers?: Record<string, string>) =>
    request<T>(endpoint, { method: 'DELETE', headers }),

  patch: <T = unknown>(endpoint: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
};

export default api;
