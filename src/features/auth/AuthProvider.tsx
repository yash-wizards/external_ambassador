import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getConfig } from '@/config/env';
import { authenticateMock } from '@/mocks/store';
import { clearAuth0Cache, loginWithPopup, logoutAuth0, readAuth0RefreshToken, refreshSilently } from '@/services/auth0Client';
import type { HttpContext } from '@/services/http';
import { bootstrapLiveSession, createHttpContext, logoutLive } from '@/services/intotoApi';
import {
  clearSession,
  getDeviceId,
  readAccessToken,
  readRefId,
  readRefreshToken,
  readSessionUser,
  updateAccessToken,
  writeSession,
} from '@/services/session';
import type { SessionUser } from '@/types/domain';

interface AuthContextValue {
  user: SessionUser | null;
  ready: boolean;
  mode: 'mock' | 'live';
  http: HttpContext;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => getConfig(), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const refRef = useRef<string | null>(null);

  const applySession = useCallback((next: SessionUser, accessToken: string, refreshToken?: string | null) => {
    tokenRef.current = accessToken;
    refRef.current = next.refId;
    writeSession({
      accessToken,
      refreshToken,
      refId: next.refId,
      userJson: JSON.stringify(next),
    });
    setUser(next);
  }, []);

  const dropSession = useCallback(() => {
    tokenRef.current = null;
    refRef.current = null;
    clearSession();
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (config.authMode !== 'live') return null;
    const fresh = await refreshSilently(config);
    if (fresh) {
      tokenRef.current = fresh;
      updateAccessToken(fresh);
    }
    return fresh;
  }, [config]);

  const http = useMemo(
    () =>
      createHttpContext(config, {
        getAccessToken: () => tokenRef.current,
        getRefId: () => refRef.current,
        getDeviceId,
        refreshAccessToken,
        onUnauthorized: dropSession,
      }),
    [config, dropSession, refreshAccessToken],
  );

  useEffect(() => {
    const stored = readSessionUser<SessionUser>();
    const token = readAccessToken();
    if (stored && token) {
      tokenRef.current = token;
      refRef.current = readRefId();
      setUser(stored);
    }
    setReady(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      if (config.authMode === 'mock') {
        const next = authenticateMock(email, password);
        applySession(next, 'mock-session', null);
        return;
      }
      const accessToken = await loginWithPopup(config);
      tokenRef.current = accessToken;
      const next = await bootstrapLiveSession(http);
      applySession(next, accessToken, readAuth0RefreshToken());
    },
    [applySession, config, http],
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      if (user?.source === 'live') {
        const refreshToken = readRefreshToken() || readAuth0RefreshToken();
        if (refreshToken && refRef.current) {
          await logoutLive(http, refreshToken);
        }
        await logoutAuth0(config);
        clearAuth0Cache();
      }
    } finally {
      dropSession();
    }
  }, [config, dropSession, http, user?.source]);

  const value = useMemo(
    () => ({ user, ready, mode: config.authMode, http, login, logout, error }),
    [config.authMode, error, http, login, logout, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
