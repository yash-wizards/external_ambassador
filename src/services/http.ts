export class ApiError extends Error {
  status: number;
  retryable: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Safe methods are retried once on 429 and 5xx. */
  retry?: boolean;
}

export interface HttpContext {
  baseUrl: string;
  timeoutMs: number;
  getAccessToken: () => string | null;
  getRefId: () => string | null;
  getDeviceId: () => string;
  refreshAccessToken: () => Promise<string | null>;
  onUnauthorized: () => void;
}

const inflight = new Map<string, Promise<unknown>>();

let refreshInFlight: Promise<string | null> | null = null;

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function refreshOnce(ctx: HttpContext): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = ctx.refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function execute<T>(ctx: HttpContext, path: string, options: RequestOptions, retriedAuth: boolean): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? ctx.timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort);

  try {
    const headers = new Headers(options.headers);
    if (options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const token = ctx.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const refId = ctx.getRefId();
    if (refId) headers.set('refid', refId);
    headers.set('x-device-id', ctx.getDeviceId());

    const response = await fetch(buildUrl(ctx.baseUrl, path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 401 && !retriedAuth) {
      const fresh = await refreshOnce(ctx);
      if (fresh) return execute<T>(ctx, path, options, true);
      ctx.onUnauthorized();
      throw new ApiError(401, 'Your session has expired. Sign in again.');
    }

    if (!response.ok) {
      let message = response.statusText || 'Request failed';
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload.message) message = payload.message;
      } catch {
        /* non-JSON error body */
      }
      if (response.status === 401) ctx.onUnauthorized();
      throw new ApiError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out or was cancelled.');
    }
    throw new ApiError(0, 'Network request failed.');
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

export async function request<T>(ctx: HttpContext, path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const canRetry = options.retry !== false && (method === 'GET' || method === 'HEAD');

  try {
    return await execute<T>(ctx, path, options, false);
  } catch (error) {
    if (canRetry && error instanceof ApiError && error.retryable) {
      await sleep(400);
      return execute<T>(ctx, path, options, false);
    }
    throw error;
  }
}

/** Collapse identical in-flight reads so a rerender does not duplicate the call. */
export function dedupe<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = task().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

export function userFacingStatus(error: unknown): { status: number; message: string } {
  if (error instanceof ApiError) {
    if (error.status === 401) return { status: 401, message: 'Your session has expired. Sign in again.' };
    if (error.status === 403) return { status: 403, message: 'You do not have access to this information.' };
    if (error.status === 404) return { status: 404, message: 'That record could not be found.' };
    if (error.status === 429) return { status: 429, message: 'Too many requests. Wait a moment and try again.' };
    if (error.status >= 500) return { status: error.status, message: 'The service is unavailable. Try again.' };
    if (error.status === 0) return { status: 0, message: error.message };
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error && error.message) return { status: 0, message: error.message };
  return { status: 0, message: 'Something went wrong.' };
}
