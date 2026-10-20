import { resolveFrameAncestors } from '@/config/framePolicy';

export interface AppConfig {
  apiBaseUrl: string;
  authMode: 'mock' | 'live';
  auth0Domain: string;
  auth0ClientId: string;
  auth0Audience: string;
  timeoutMs: number;
  frameAncestors: string[];
  isDev: boolean;
}

function read(name: keyof ImportMetaEnv, fallback = ''): string {
  return (import.meta.env[name] ?? fallback).trim();
}

export function isAuth0Configured(domain: string, clientId: string): boolean {
  return Boolean(domain && clientId);
}

export function resolveAuthMode(
  requested: string,
  domain: string,
  clientId: string,
): 'mock' | 'live' {
  if (requested === 'live' && isAuth0Configured(domain, clientId)) return 'live';
  return 'mock';
}

export function getConfig(): AppConfig {
  const auth0Domain = read('VITE_AUTH0_DOMAIN');
  const auth0ClientId = read('VITE_AUTH0_CLIENT_ID');
  const apiBaseUrl = read('VITE_API_BASE_URL', 'http://localhost:3000').replace(/\/api\/?$/, '');
  const timeout = Number(read('VITE_API_TIMEOUT_MS', '30000'));

  return {
    apiBaseUrl,
    authMode: resolveAuthMode(read('VITE_AUTH_MODE', 'mock'), auth0Domain, auth0ClientId),
    auth0Domain,
    auth0ClientId,
    auth0Audience: read('VITE_AUTH0_AUDIENCE'),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 30000,
    frameAncestors: resolveFrameAncestors(read('VITE_FRAME_ANCESTORS') || undefined, import.meta.env.DEV),
    isDev: import.meta.env.DEV,
  };
}
