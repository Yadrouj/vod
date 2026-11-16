import { sourceLinkExpiry } from './alternative-source-links.mjs';
import { publicCacheHeaders } from './runtime-cache';

export function downloadResponseLifetime(links: { url: string; expiresAt?: string }[], now = Date.now()) {
  const expiry = Math.min(Infinity, ...links.map(sourceLinkExpiry));
  const signed = Number.isFinite(expiry);
  return { signed, ttlMs: signed ? Math.max(1000, Math.min(300_000, expiry - now - 60_000)) : 900_000 };
}

export function downloadResponseHeaders(entry: { signed: boolean; expiresAt: number }, now = Date.now()) {
  const remaining = Math.max(0, Math.floor((entry.expiresAt - now) / 1000));
  return publicCacheHeaders(entry.signed
    ? { browserSeconds: Math.min(30, remaining), edgeSeconds: remaining, staleSeconds: 0 }
    : { browserSeconds: 30, edgeSeconds: 600 });
}
