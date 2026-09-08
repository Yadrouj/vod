import type { IncomingMessage, ServerResponse } from "node:http";
import { isIP } from "node:net";

export const BUSY_MESSAGE = "تعداد درخواست‌ها زیاد است؛ در حال مدیریت صف هستیم. چند لحظه دیگر دوباره تلاش کنید.";
type Pending = { run: () => void; cancel: () => void; timer: ReturnType<typeof setTimeout> };

/** Bounded FIFO admission, not a promise queue that can grow without limit.
 * A slot is held until the response finishes, including streamed bodies. */
export class RequestLane {
  active = 0;
  admitted = 0;
  rejected = 0;
  private queue: Pending[] = [];
  private draining = false;
  constructor(readonly capacity: number, readonly maxQueue: number, readonly waitMs: number) {}
  get queued() { return this.queue.length; }
  enter(request: IncomingMessage, response: ServerResponse, run: () => void) {
    const start = () => {
      if (response.destroyed || response.writableEnded) return;
      this.active++;
      this.admitted++;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        response.off("finish", release);
        response.off("close", release);
        this.active--;
        this.drain();
      };
      response.once("finish", release);
      response.once("close", release);
      run();
    };
    if (this.active < this.capacity && this.queue.length === 0) { start(); return; }
    if (this.queue.length >= this.maxQueue) { this.rejected++; sendBusy(request, response); return; }
    const started = Date.now();
    const pending: Pending = {
      run: () => {
        response.off("close", pending.cancel);
        response.setHeader("X-Queue-Wait-Ms", String(Date.now() - started));
        start();
      },
      cancel: () => { clearTimeout(pending.timer); this.queue = this.queue.filter(item => item !== pending); },
      timer: setTimeout(() => {
        pending.cancel();
        response.off("close", pending.cancel);
        this.rejected++;
        sendBusy(request, response);
      }, this.waitMs),
    };
    this.queue.push(pending);
    response.once("close", pending.cancel);
    this.drain();
  }
  private drain() {
    if (this.draining || this.active >= this.capacity || !this.queue.length) return;
    this.draining = true;
    // Yield between render admissions so media sockets and newly accepted TCP
    // connections get an event-loop turn instead of a recursive SSR chain.
    setImmediate(() => {
      this.draining = false;
      if (this.active < this.capacity) {
        const next = this.queue.shift();
        if (next) { clearTimeout(next.timer); next.run(); }
      }
      this.drain();
    });
  }
  snapshot() { return { active: this.active, queued: this.queued, capacity: this.capacity, admitted: this.admitted, rejected: this.rejected }; }
}

/** Bounded token buckets. Tokens refill gradually; spoofing forwarded headers
 * cannot create arbitrary visitor identities on a directly exposed origin. */
export class RequestBudget {
  private entries = new Map<string, { tokens: number; at: number }>();
  private prunedAt = -Infinity;
  constructor(readonly burst: number, readonly perSecond: number, readonly maxKeys = 20_000) {}
  allow(key: string, now = Date.now()) {
    const prior = this.entries.get(key);
    const tokens = Math.min(this.burst, prior ? prior.tokens + Math.max(0, now - prior.at) * this.perSecond / 1000 : this.burst);
    if (!prior && this.entries.size >= this.maxKeys) {
      // Fail closed if every retained identity is still active. Evicting active
      // entries would allow identity churn to reset a client's budget.
      if (now - this.prunedAt >= 1000) {
        this.prunedAt = now;
        for (const [id, entry] of this.entries) {
          if (now - entry.at > this.burst / this.perSecond * 1000) this.entries.delete(id);
        }
      }
      if (this.entries.size >= this.maxKeys) return false;
    }
    this.entries.set(key, { tokens: Math.max(0, tokens - 1), at: now });
    return tokens >= 1;
  }
}

export function normalizeIp(value: string) { return value.startsWith("::ffff:") ? value.slice(7) : value; }
export function verifiedClientIp(request: IncomingMessage, trustedPeers: Set<string>, isolatedProxy = false) {
  const peer = normalizeIp(request.socket.remoteAddress ?? "unknown");
  const header = request.headers["x-real-ip"];
  // Exact peer addresses only, never trust arbitrary XFF / CF headers.
  return (isolatedProxy || trustedPeers.has(peer)) && typeof header === "string" && isIP(header) ? normalizeIp(header) : peer;
}

export function sendBusy(request: IncomingMessage, response: ServerResponse, status = 503) {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  const html = !request.url?.startsWith("/api/") && String(request.headers.accept).includes("text/html");
  response.writeHead(status, {
    "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "private, no-store", "Retry-After": "5", "X-Sarvnema-Busy": "1",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(html ? `<!doctype html><html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کمی شلوغ است | سرونما</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0b0b0b;color:#eee;font:18px/2 system-ui}main{max-width:32rem;margin:24px;padding:32px;border:1px solid #e8ca7044;border-radius:24px}a{display:inline-block;color:#16130a;background:#e8ca70;padding:8px 20px;border-radius:12px;text-decoration:none}</style><main><h1>کمی شلوغ است</h1><p>${BUSY_MESSAGE}</p><p>پخش‌های فعال در اولویت می‌مانند.</p><a href="">تلاش دوباره</a></main></html>`
    : JSON.stringify({ error: BUSY_MESSAGE, code: status === 429 ? "RATE_LIMITED" : "SERVER_BUSY", retryAfter: 5 }));
}

export function createRequestAdmission(env: NodeJS.ProcessEnv = process.env) {
  const number = (key: string, fallback: number, maximum: number) => {
    const value = Number(env[key]);
    return Number.isInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
  };
  const pages = new RequestLane(number("HTTP_PAGE_CONCURRENCY", 16, 128), number("HTTP_QUEUE_LIMIT", 128, 500), number("HTTP_QUEUE_WAIT_MS", 8000, 15000));
  const media = new RequestLane(number("HTTP_MEDIA_CONCURRENCY", 128, 512), 0, 0);
  const uploads = new RequestLane(number("HTTP_UPLOAD_CONCURRENCY", 4, 16), 0, 0);
  const assets = new RequestLane(128, 128, 3000);
  const budget = new RequestBudget(number("HTTP_IP_BURST", 160, 1000), number("HTTP_IP_RATE", 12, 100));
  const trustedPeers = new Set((env.TRUSTED_PROXY_IPS ?? "").split(",").map(value => normalizeIp(value.trim())).filter(value => isIP(value)));
  return {
    trustedPeers,
    isolatedProxy: env.TRUST_ISOLATED_PROXY === "1",
    snapshot: () => ({ pages: pages.snapshot(), media: media.snapshot(), uploads: uploads.snapshot(), assets: assets.snapshot() }),
    run(request: IncomingMessage, response: ServerResponse, handler: () => void) {
      const ip = verifiedClientIp(request, trustedPeers, env.TRUST_ISOLATED_PROXY === "1");
      // Next route handlers only see sanitized identity headers.
      delete request.headers["cf-connecting-ip"];
      request.headers["x-real-ip"] = ip;
      request.headers["x-forwarded-for"] = ip;
      const path = (request.url ?? "/").split("?", 1)[0];
      if (path === "/healthz" || path === "/readyz") { handler(); return; }
      if (path.startsWith("/_next/static/") || /^\/(fonts|brand)\//.test(path)) { assets.enter(request, response, handler); return; }
      if (!budget.allow(ip)) { sendBusy(request, response, 429); return; }
      const lane = path === "/api/watch-party/personal-media/upload" ? uploads
        : path === "/api/music/media" || path.startsWith("/api/watch-party/personal-media/") ? media : pages;
      lane.enter(request, response, handler);
    },
  };
}
