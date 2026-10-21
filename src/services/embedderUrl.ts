type Listener = (url: string | null) => void;

let embedderUrl: string | null = null;
const listeners = new Set<Listener>();

function httpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function isEmbedded(): boolean {
  return window.self !== window.top;
}

/** Same-origin parent only. Cross-origin access throws and returns null. */
export function readSameOriginParentUrl(): string | null {
  if (!isEmbedded()) return null;
  try {
    return httpUrl(window.parent.location.href)?.toString() ?? null;
  } catch {
    return null;
  }
}

/** Browser-reported address of the page that loaded this iframe. */
export function readReferrerUrl(): string | null {
  if (!isEmbedded()) return null;
  return httpUrl(document.referrer)?.toString() ?? null;
}

/**
 * Full parent address from an allow-listed ping.
 * The URL origin must match the message origin so a parent cannot name another site.
 */
export function parentUrlFromMessage(data: unknown, eventOrigin: string): string | null {
  if (!data || typeof data !== 'object') return null;
  const pageUrl = (data as { pageUrl?: unknown }).pageUrl;
  if (typeof pageUrl !== 'string') return null;
  const url = httpUrl(pageUrl);
  if (!url || url.origin !== eventOrigin) return null;
  return url.toString();
}

export function getEmbedderUrl(): string | null {
  return embedderUrl;
}

export function subscribeEmbedderUrl(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishEmbedderUrl(url: string | null): void {
  if (!url || url === embedderUrl) return;
  embedderUrl = url;
  listeners.forEach((listener) => listener(url));
}

export function captureEmbedderUrl(): void {
  publishEmbedderUrl(readSameOriginParentUrl() || readReferrerUrl());
}
