const ACCESS = 'ea.accessToken';
const REFRESH = 'ea.refreshToken';
const REF_ID = 'ea.refId';
const USER = 'ea.user';
const DEVICE = 'ea.deviceId';

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getDeviceId(): string {
  const current = storage()?.getItem(DEVICE);
  if (current) return current;
  const created = crypto.randomUUID();
  storage()?.setItem(DEVICE, created);
  return created;
}

export function readSessionUser<T>(): T | null {
  const raw = storage()?.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSession(input: {
  accessToken: string;
  refreshToken?: string | null;
  refId: string;
  userJson: string;
}): void {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS, input.accessToken);
  store.setItem(REF_ID, input.refId);
  store.setItem(USER, input.userJson);
  if (input.refreshToken) store.setItem(REFRESH, input.refreshToken);
  else store.removeItem(REFRESH);
}

export function readAccessToken(): string | null {
  return storage()?.getItem(ACCESS) ?? null;
}

export function readRefreshToken(): string | null {
  return storage()?.getItem(REFRESH) ?? null;
}

export function readRefId(): string | null {
  return storage()?.getItem(REF_ID) ?? null;
}

export function updateAccessToken(token: string): void {
  storage()?.setItem(ACCESS, token);
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS);
  store.removeItem(REFRESH);
  store.removeItem(REF_ID);
  store.removeItem(USER);
}
