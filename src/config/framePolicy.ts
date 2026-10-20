const HTTP_ORIGIN = /^https?:\/\/[^\s/]+$/i;

/** Production builds deny framing until an allow-list is configured. */
export function resolveFrameAncestors(raw: string | undefined, isDev: boolean): string[] {
  const configured = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => HTTP_ORIGIN.test(origin));

  if (configured.length > 0) return configured;
  if (isDev) return ['http://localhost:5199', 'http://127.0.0.1:5199'];
  return [];
}

export function frameAncestorsDirective(origins: string[]): string {
  if (origins.length === 0) return "frame-ancestors 'none'";
  return `frame-ancestors ${origins.join(' ')}`;
}

export function isAllowedParentOrigin(origin: string, allowed: string[]): boolean {
  return allowed.includes(origin);
}

export type ParentBridgeAction = 'ping' | 'ignore';

/** Accept only a versioned ping. Ignore identity claims and any token fields. */
export function classifyParentMessage(data: unknown): ParentBridgeAction {
  if (!data || typeof data !== 'object') return 'ignore';
  const record = data as Record<string, unknown>;
  const sensitive = ['token', 'accessToken', 'refreshToken', 'password', 'secret'];
  if (sensitive.some((key) => key in record)) return 'ignore';
  if (record.type === 'intoto:ping' && Object.keys(record).length === 1) return 'ping';
  return 'ignore';
}
