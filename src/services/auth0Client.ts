import { createAuth0Client, type Auth0Client } from '@auth0/auth0-spa-js';
import type { AppConfig } from '@/config/env';

let client: Auth0Client | null = null;

function authorizationParams(config: AppConfig) {
  return {
    redirect_uri: window.location.origin,
    scope: 'openid profile email offline_access',
    ...(config.auth0Audience ? { audience: config.auth0Audience } : {}),
  };
}

export async function getAuth0(config: AppConfig): Promise<Auth0Client> {
  if (!client) {
    client = await createAuth0Client({
      domain: config.auth0Domain,
      clientId: config.auth0ClientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      authorizationParams: authorizationParams(config),
    });
  }
  return client;
}

export async function loginWithPopup(config: AppConfig): Promise<string> {
  const auth = await getAuth0(config);
  await auth.loginWithPopup({ authorizationParams: authorizationParams(config) });
  const token = await auth.getTokenSilently({ authorizationParams: authorizationParams(config) });
  if (!token) throw new Error('Auth0 did not return an access token.');
  return token;
}

export async function refreshSilently(config: AppConfig): Promise<string | null> {
  try {
    const auth = await getAuth0(config);
    const token = await auth.getTokenSilently({
      cacheMode: 'off',
      authorizationParams: authorizationParams(config),
    });
    return token ?? null;
  } catch {
    return null;
  }
}

export async function logoutAuth0(config: AppConfig): Promise<void> {
  try {
    const auth = await getAuth0(config);
    await auth.logout({ openUrl: false });
  } catch {
    /* local session is cleared by the caller even if Auth0 logout fails */
  }
  client = null;
}

const AUTH0_CACHE_PREFIX = '@@auth0spajs@@';

function findRefreshToken(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.refresh_token === 'string' && record.refresh_token.trim()) {
    return record.refresh_token.trim();
  }
  for (const nested of Object.values(record)) {
    const found = findRefreshToken(nested);
    if (found) return found;
  }
  return null;
}

export function readAuth0RefreshToken(): string | null {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(AUTH0_CACHE_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const token = findRefreshToken(JSON.parse(raw));
      if (token) return token;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearAuth0Cache(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(AUTH0_CACHE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
