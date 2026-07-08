// Live supplement prices from Torob (torob.com), Iran's price-comparison site.
//
// Torob fronts its API with an anti-bot layer (arcaptcha) that fingerprints the
// TLS/JA3 handshake. Plain Linux curl (and Node fetch/undici) now get HTTP 490 plus
// an HTML "آیا شما یک ربات هستید؟ / are you a robot?" captcha page instead of JSON.
// Fix: point TOROB_CURL (or reuse MEDIA_CURL) at the curl-impersonate wrapper
// (/usr/local/bin/mw-curl, mimics Chrome's JA3) to get past it — same trick the
// MuscleWiki video route uses. The wrapper already sends a browser UA, so we don't
// re-add -A when impersonating. Returns the cheapest match per query.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// On the server this is /usr/local/bin/mw-curl (curl-impersonate). Locally it falls
// back to plain curl, which Torob will challenge — that's expected off-server.
const CURL_BIN = process.env.TOROB_CURL || process.env.MEDIA_CURL || "curl";
const IMPERSONATE = CURL_BIN !== "curl";

type TorobResult = {
  name1?: string;
  name2?: string;
  price?: number;
  web_client_absolute_url?: string;
  image_url?: string | null;
  shop_text?: string;
};

type Payload = {
  found: boolean;
  name?: string;
  nameEn?: string;
  price?: number;
  url?: string;
  image?: string | null;
  shops?: string;
};

// Small in-memory cache so repeated lookups (and page reloads) don't re-hit Torob
// and re-trip its bot challenge. Only successful hits are cached, so a transient
// block never gets pinned for the whole TTL.
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; payload: Payload }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return Response.json({ found: false }, { status: 400 });

  const cached = cache.get(q);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return Response.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  }

  const url = `https://api.torob.com/v4/base-product/search/?q=${encodeURIComponent(
    q
  )}&page=0`;

  // Torob also scores IP reputation, so from a datacenter IP the captcha appears
  // even with a matching TLS fingerprint. Set TOROB_PROXY to an Iran-resident /
  // residential HTTP or SOCKS proxy (e.g. socks5h://user:pass@host:port) to route
  // this one request through it and get live prices.
  const proxy = process.env.TOROB_PROXY;
  const common = [
    "-s",
    "--compressed",
    "--max-time",
    "20",
    ...(proxy ? ["--proxy", proxy] : []),
    "-H",
    "Accept: application/json",
    "-H",
    "Referer: https://torob.com/",
    url,
  ];
  const args = IMPERSONATE ? common : ["-A", UA, ...common];

  let stdout: string;
  try {
    ({ stdout } = await execFileP(CURL_BIN, args, {
      maxBuffer: 16 * 1024 * 1024,
    }));
  } catch {
    // curl itself failed: binary missing, timeout, DNS, geo-block, etc.
    return Response.json({ found: false }, { status: 502 });
  }

  let data: { results?: TorobResult[] };
  try {
    data = JSON.parse(stdout);
  } catch {
    // Non-JSON body (e.g. the arcaptcha bot-challenge HTML). Upstream blocked us —
    // don't throw, just report "no price" so the UI degrades gracefully.
    return Response.json({ found: false }, { status: 502 });
  }

  const r = (data.results || []).find(
    (x) => typeof x.price === "number" && x.price > 0
  );
  if (!r) return Response.json({ found: false });

  const payload: Payload = {
    found: true,
    name: r.name1 ?? r.name2 ?? q,
    nameEn: r.name2 ?? "",
    price: r.price, // Toman
    url: r.web_client_absolute_url
      ? `https://torob.com${r.web_client_absolute_url}`
      : `https://torob.com/search/?query=${encodeURIComponent(q)}`,
    image: r.image_url ?? null,
    shops: r.shop_text ?? "",
  };
  cache.set(q, { at: Date.now(), payload });

  return Response.json(payload, {
    headers: { "Cache-Control": "public, max-age=1800" },
  });
}
