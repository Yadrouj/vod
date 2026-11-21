import { statfs } from "node:fs/promises";
import { s3PublicUrl, s3PutObject } from "./s3-lite.mjs";
import { isMirrorImageHost, parseMirrorableImageUrl } from "./image-mirror-path.mjs";
import { externalObjectKey } from "./image-mirror-key.mjs";
import { tmdbImageType } from "./tmdb-image-path.mjs";
import { tmdbMirrorConfig, type TmdbMirrorConfig } from "./tmdb-mirror";

export type ImageMirrorResult =
  | { kind: "image"; bytes: Uint8Array; type: string; source: "mirror" | "upstream" }
  | { kind: "redirect"; location: string }
  | { kind: "not-found" };

const MAX_BYTES = 10 * 1024 * 1024;
const MIRROR_TIMEOUT_MS = 3_000;
const UPSTREAM_TIMEOUT_MS = 8_000;
const HOST_COOLDOWN_MS = 5 * 60_000;
const MAX_REDIRECTS = 3;
// Never fill the shared server disk: below this, images are served but not stored.
// "0" disables the check (the bucket lives on another server with its own quota).
const MIN_FREE_BYTES = /^\d+$/.test(process.env.IMAGE_MIRROR_MIN_FREE_BYTES ?? "") ? Number(process.env.IMAGE_MIRROR_MIN_FREE_BYTES) : 3 * 1024 ** 3;
const DISK_CHECK_MS = 60_000;

const blockedHosts = new Map<string, number>();
const inFlight = new Map<string, Promise<ImageMirrorResult>>();
let diskCheckedAt = 0;
let diskHasRoom = true;

export { externalObjectKey };

async function hasDiskRoom(dir: string) {
  if (MIN_FREE_BYTES <= 0) return true;
  if (Date.now() - diskCheckedAt < DISK_CHECK_MS) return diskHasRoom;
  diskCheckedAt = Date.now();
  try {
    const stats = await statfs(dir);
    diskHasRoom = stats.bavail * stats.bsize >= MIN_FREE_BYTES;
  } catch {
    diskHasRoom = false;
  }
  return diskHasRoom;
}

async function readImage(response: Response) {
  if (!response.ok || !response.body) return null;
  if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) return null;
  const type = tmdbImageType(bytes);
  return type ? { bytes, type } : null;
}

async function timedFetch(fetchImpl: typeof fetch, url: string, timeoutMs: number, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    // Read the body inside the deadline as well.
    const image = await readImage(response).catch(() => null);
    return { response, image };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Follows redirects by hand so every hop stays on an allow-listed image host. */
async function fetchUpstream(fetchImpl: typeof fetch, start: URL) {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetchImpl(current.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; SarvNemaImageMirror/1.0)", accept: "image/avif,image/webp,image/*;q=0.8" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const next = location ? parseMirrorableImageUrl(new URL(location, current).href) : null;
        if (!next) return { ok: false as const, reachable: true };
        current = next;
        continue;
      }
      const image = await readImage(response).catch(() => null);
      return image ? { ok: true as const, ...image } : { ok: false as const, reachable: response.status < 500 };
    } catch {
      return { ok: false as const, reachable: false };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false as const, reachable: true };
}

/**
 * Resolves /media/img/...: the MinIO mirror first, then the upstream host when
 * this server can reach it (storing the copy while the disk has room), and
 * finally a redirect to the original URL, so nothing is worse than before.
 */
export async function resolveExternalImage(upstreamUrl: string, config: TmdbMirrorConfig = tmdbMirrorConfig(), fetchImpl: typeof fetch = fetch, diskDir = "/"): Promise<ImageMirrorResult> {
  const upstream = parseMirrorableImageUrl(upstreamUrl);
  if (!upstream || !isMirrorImageHost(upstream.hostname)) return { kind: "not-found" };
  const key = externalObjectKey(upstream);
  let job = inFlight.get(key);
  if (!job) {
    job = resolveUncached(upstream, key, config, fetchImpl, diskDir).finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return job;
}

async function resolveUncached(upstream: URL, key: string, config: TmdbMirrorConfig, fetchImpl: typeof fetch, diskDir: string): Promise<ImageMirrorResult> {
  if (config.endpoint) {
    const stored = await timedFetch(fetchImpl, s3PublicUrl(config.endpoint, config.bucket, key), MIRROR_TIMEOUT_MS);
    if (stored?.image) return { kind: "image", ...stored.image, source: "mirror" };
  }

  const host = upstream.hostname;
  if ((blockedHosts.get(host) ?? 0) <= Date.now()) {
    const fetched = await fetchUpstream(fetchImpl, upstream);
    if (fetched.ok) {
      blockedHosts.delete(host);
      if (config.endpoint && config.accessKey && config.secretKey && await hasDiskRoom(diskDir)) {
        void s3PutObject(
          { endpoint: config.endpoint, accessKey: config.accessKey, secretKey: config.secretKey },
          config.bucket, key, fetched.bytes, fetched.type,
        ).catch(() => undefined);
      }
      return { kind: "image", bytes: fetched.bytes, type: fetched.type, source: "upstream" };
    }
    // Filtered hosts (TVMaze, YouTube) time out: stop paying that per request.
    if (!fetched.reachable) blockedHosts.set(host, Date.now() + HOST_COOLDOWN_MS);
  }
  return { kind: "redirect", location: upstream.href };
}

export function resetImageMirrorState() {
  blockedHosts.clear();
  inFlight.clear();
  diskCheckedAt = 0;
  diskHasRoom = true;
}
