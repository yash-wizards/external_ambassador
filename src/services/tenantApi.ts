import { endpoints } from '@/config/endpoints';
import { ApiError, request, type HttpContext } from '@/services/http';
import type { SendResponse } from '@/types/domain';

export interface TenantInfo {
  name: string;
  shortCode: string;
  tenantKey: string;
  tenantId: string;
}

interface TenantPayload {
  name?: string;
  shortCode?: string;
  tenantKey?: string;
  tenantId?: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function mapTenant(payload: SendResponse<TenantPayload> | null | undefined): TenantInfo | null {
  const info = payload?.info;
  if (!info || typeof info !== 'object') return null;
  const name = text(info.name);
  if (!name) return null;
  return {
    name,
    shortCode: text(info.shortCode),
    tenantKey: text(info.tenantKey),
    tenantId: text(info.tenantId),
  };
}

/** Public lookup. In dev the Vite server proxies /auth so the browser stays same-origin. */
export async function fetchTenant(ctx: HttpContext, domain: string): Promise<TenantInfo> {
  const baseUrl = import.meta.env.DEV ? window.location.origin : ctx.baseUrl;
  try {
    const payload = await request<SendResponse<TenantPayload>>(
      { ...ctx, baseUrl },
      endpoints.tenantResolve,
      { query: { domain } },
    );
    const tenant = mapTenant(payload);
    if (!tenant) throw new ApiError(404, 'That university could not be found.');
    return tenant;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new ApiError(404, 'That university could not be found.');
    }
    throw error;
  }
}
