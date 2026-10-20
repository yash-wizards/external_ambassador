import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, type HttpContext } from '@/services/http';

function context(overrides: Partial<HttpContext> = {}): HttpContext {
  return {
    baseUrl: 'http://api.test',
    timeoutMs: 1000,
    getAccessToken: () => 'token-a',
    getRefId: () => 'ref-1',
    getDeviceId: () => 'device-1',
    refreshAccessToken: async () => null,
    onUnauthorized: () => undefined,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('http client', () => {
  it('refreshes once when parallel requests receive 401', async () => {
    let token = 'token-a';
    let refreshes = 0;
    const unauthorized = vi.fn();
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Authorization') === 'Bearer token-a') {
        return new Response(JSON.stringify({ message: 'jwt_expired' }), { status: 401 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const ctx = context({
      getAccessToken: () => token,
      refreshAccessToken: async () => {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        token = 'token-b';
        return token;
      },
      onUnauthorized: unauthorized,
    });

    const [first, second] = await Promise.all([
      request<{ success: boolean }>(ctx, '/api/community'),
      request<{ success: boolean }>(ctx, '/api/community/category'),
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(refreshes).toBe(1);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('ends the session when refresh fails', async () => {
    const unauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'expired' }), { status: 401 })),
    );

    await expect(request(context({ onUnauthorized: unauthorized }), '/api/user-profile/profile')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('maps forbidden, missing, and rate-limit responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'denied' }), { status: 403 })),
    );
    await expect(request(context(), '/api/community/private')).rejects.toMatchObject({ status: 403 });
  });
});
