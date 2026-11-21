import { s3PublicUrl, s3PutObject } from "./s3-lite.mjs";
import {
  isTmdbImageFile,
  isTmdbImageSize,
  tmdbFallbackSizes,
  tmdbImageType,
  tmdbObjectKey,
  tmdbUpstreamUrl,
} from "./tmdb-image-path.mjs";

export type TmdbMirrorConfig = {
  endpoint: string | null;
  bucket: string;
  accessKey: string | null;
  secretKey: string | null;
  upstream: boolean;
};

export type TmdbMirrorResult =
  | { kind: "image"; bytes: Uint8Array; type: string; exact: boolean; source: "mirror" | "upstream" }
  | { kind: "redirect"; location: string }
  | { kind: "not-found" };

const MAX_BYTES = 8 * 1024 * 1024;
const MIRROR_TIMEOUT_MS = 3_000;
const UPSTREAM_TIMEOUT_MS = 2_500;
const UPSTREAM_COOLDOWN_MS = 5 * 60_000;
const MAX_MIRROR_LOOKUPS = 4;

// The production server cannot reach TMDB (filtered DNS). After one failure,
// stop paying the timeout on every visitor request for a while.
let upstreamBlockedUntil = 0;

export function tmdbMirrorConfig(env: NodeJS.ProcessEnv = process.env): TmdbMirrorConfig {
  return {
    endpoint: env.TMDB_MIRROR_ENDPOINT?.trim() || null,
    bucket: env.TMDB_MIRROR_BUCKET?.trim() || "sarvnema-tmdb",
    accessKey: env.TMDB_MIRROR_ACCESS_KEY?.trim() || env.MINIO_ROOT_USER?.trim() || null,
    secretKey: env.TMDB_MIRROR_SECRET_KEY?.trim() || env.MINIO_ROOT_PASSWORD?.trim() || null,
    upstream: env.TMDB_MIRROR_UPSTREAM !== "0",
  };
}

async function readImage(response: Response) {
  if (!response.ok || !response.body) return null;
  if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) return null;
  const type = tmdbImageType(bytes);
  return type ? { bytes, type } : null;
}

async function timedFetch(fetchImpl: typeof fetch, url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves /media/tmdb/<size>/<file>: the MinIO mirror first (nearest stored
 * size if the exact one is missing), then TMDB itself when this host can reach
 * it (storing the result), and finally a redirect to TMDB so the page never
 * gets worse than it was before the mirror existed.
 */
export async function resolveTmdbImage(size: string, file: string, config = tmdbMirrorConfig(), fetchImpl: typeof fetch = fetch): Promise<TmdbMirrorResult> {
  if (!isTmdbImageSize(size) || !isTmdbImageFile(file)) return { kind: "not-found" };

  if (config.endpoint) {
    for (const candidate of tmdbFallbackSizes(size).slice(0, MAX_MIRROR_LOOKUPS)) {
      const response = await timedFetch(fetchImpl, s3PublicUrl(config.endpoint, config.bucket, tmdbObjectKey(candidate, file)), MIRROR_TIMEOUT_MS);
      if (!response) break; // MinIO unreachable: don't try every size.
      const image = await readImage(response).catch(() => null);
      if (image) return { kind: "image", ...image, exact: candidate === size, source: "mirror" };
    }
  }

  const upstreamUrl = tmdbUpstreamUrl(size, file);
  if (config.upstream && Date.now() >= upstreamBlockedUntil) {
    const response = await timedFetch(fetchImpl, upstreamUrl, UPSTREAM_TIMEOUT_MS);
    const image = response ? await readImage(response).catch(() => null) : null;
    if (image) {
      if (config.endpoint && config.accessKey && config.secretKey) {
        // Fill the mirror in the background; the visitor already has the bytes.
        void s3PutObject(
          { endpoint: config.endpoint, accessKey: config.accessKey, secretKey: config.secretKey },
          config.bucket, tmdbObjectKey(size, file), image.bytes, image.type,
        ).catch(() => undefined);
      }
      return { kind: "image", ...image, exact: true, source: "upstream" };
    }
    if (!response || response.status >= 500) upstreamBlockedUntil = Date.now() + UPSTREAM_COOLDOWN_MS;
  }

  return { kind: "redirect", location: upstreamUrl };
}

export function resetTmdbUpstreamCooldown() {
  upstreamBlockedUntil = 0;
}
