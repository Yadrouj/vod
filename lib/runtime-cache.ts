type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TtlLruCache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Map insertion order gives us a small and dependency-free LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs = this.ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as K | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return value;
  }

  delete(key: K) {
    this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}

type RateBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const rateBuckets = new Map<string, RateBucket>();
const MAX_RATE_BUCKETS = 20_000;

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;
  if (rateBuckets.size > MAX_RATE_BUCKETS) pruneRateBuckets(now);

  const remaining = Math.max(0, limit - bucket.count);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function pruneRateBuckets(now: number) {
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now || rateBuckets.size > MAX_RATE_BUCKETS) rateBuckets.delete(key);
    if (rateBuckets.size <= MAX_RATE_BUCKETS * 0.8) break;
  }
}

export function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function rateLimitedResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export function publicCacheHeaders({
  browserSeconds = 30,
  edgeSeconds = 300,
  staleSeconds = 86_400,
}: {
  browserSeconds?: number;
  edgeSeconds?: number;
  staleSeconds?: number;
} = {}) {
  return {
    "Cache-Control": `public, max-age=${browserSeconds}, s-maxage=${edgeSeconds}, stale-while-revalidate=${staleSeconds}`,
    "CDN-Cache-Control": `public, s-maxage=${edgeSeconds}, stale-while-revalidate=${staleSeconds}`,
    Vary: "Accept-Encoding",
  };
}

export function normalizeSearchQuery(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 160);
}
