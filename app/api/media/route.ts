// Same-origin video proxy for MuscleWiki media, with a server-side disk cache.
//
// Why this exists:
//  1) MuscleWiki's Cloudflare returns 403 to real *browser* requests for the mp4s
//     (cross-site Sec-Fetch signature + ORB). Proxying makes them same-origin.
//  2) Cloudflare also fingerprints the HTTP client: Node's built-in fetch (undici) is
//     blocked, but `curl` (Windows Schannel TLS) is served. So we fetch via curl.
//  3) Each clip is downloaded once into `.media-cache/` and served from disk on every
//     later request — instant replays, and it keeps working offline once cached.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const ALLOWED_HOST = "media.musclewiki.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const CACHE_DIR = path.join(process.cwd(), ".media-cache");

/** Download the clip via curl (once) and return the local cache path. */
async function ensureCached(url: string): Promise<string> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const key = createHash("sha1").update(url).digest("hex") + ".mp4";
  const dest = path.join(CACHE_DIR, key);
  try {
    await fs.access(dest);
    return dest; // cache hit
  } catch {
    /* miss -> download */
  }
  const tmp = path.join(tmpdir(), `mw-${process.pid}-${Date.now()}.mp4`);
  // On datacenter IPs Cloudflare fingerprints the TLS handshake and 403s plain
  // curl for the video path (posters still work). Set MEDIA_CURL to a
  // curl-impersonate wrapper (mimics Chrome's JA3) to bypass it; that wrapper
  // already sets the browser UA/headers, so we don't re-add -A here.
  const CURL_BIN = process.env.MEDIA_CURL || "curl";
  const impersonate = CURL_BIN !== "curl";
  const args = impersonate
    ? ["-s", "--fail", "--max-time", "60", "-H", "Referer: https://musclewiki.com/", "-H", "Range: bytes=0-", "-o", tmp, url]
    : ["-s", "--fail", "--compressed", "--max-time", "60", "-A", UA, "-H", "Referer: https://musclewiki.com/", "-H", "Range: bytes=0-", "-o", tmp, url];
  await execFileP(CURL_BIN, args, { maxBuffer: 128 * 1024 * 1024 });
  await fs.rename(tmp, dest);
  return dest;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || target.hostname !== ALLOWED_HOST) {
    return new Response("forbidden host", { status: 403 });
  }

  let file: string;
  try {
    file = await ensureCached(target.toString());
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  const full = await fs.readFile(file);
  const total = full.length;
  const base: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=604800, immutable",
  };

  const range = request.headers.get("range");
  const match = range ? /bytes=(\d+)-(\d*)/.exec(range) : null;
  if (match) {
    const start = parseInt(match[1], 10);
    const hasEnd = match[2] !== "";
    const end = hasEnd ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    // Treat "the whole file" (bytes=0-) as a plain 200 so the SW/browser can cache it
    // for offline; only serve 206 for genuine sub-range seeks.
    const isFullFile = start === 0 && end >= total - 1;
    if (!isFullFile) {
      if (Number.isNaN(start) || start >= total || start > end) {
        return new Response(null, {
          status: 416,
          headers: { ...base, "Content-Range": `bytes */${total}` },
        });
      }
      const chunk = full.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          ...base,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Length": String(chunk.length),
        },
      });
    }
  }

  return new Response(full, {
    status: 200,
    headers: { ...base, "Content-Length": String(total) },
  });
}
