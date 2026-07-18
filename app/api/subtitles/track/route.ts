import { unzipSync } from "fflate";
import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";
import { decodeSubtitleBytes, normalizeSubtitleToVtt } from "@/lib/subtitle-format";

export const dynamic = "force-dynamic";

const MAX_COMPRESSED_BYTES = 4 * 1024 * 1024;
const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TRUSTED_HOSTS = new Set(["subzone.ir", "www.subzone.ir", "media.sub-api.ir"]);
const SUBTITLE_FILE = /\.(vtt|srt|ass|ssa|txt)$/i;

export async function GET(request: Request) {
  const rate = checkRateLimit(`subtitle-track:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const remoteUrl = new URL(request.url).searchParams.get("url")?.trim();
  if (!remoteUrl) return Response.json({ error: "Subtitle URL is required." }, { status: 400 });

  try {
    const response = await fetchTrustedSubtitle(remoteUrl);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_COMPRESSED_BYTES) throw new SubtitleRequestError("Subtitle package is too large.", 413);

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_COMPRESSED_BYTES) throw new SubtitleRequestError("Subtitle package is too large.", 413);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const fileName = fileNameFromResponse(response) || fileNameFromUrl(response.url) || "subtitle.srt";
    const subtitle = isZip(bytes, contentType, fileName) ? extractSubtitle(bytes) : { bytes, fileName };
    if (subtitle.bytes.byteLength > MAX_SUBTITLE_BYTES) throw new SubtitleRequestError("Subtitle file is too large.", 413);

    const text = decodeSubtitleBytes(subtitle.bytes);
    if (/^\s*<!doctype html|^\s*<html/i.test(text)) throw new SubtitleRequestError("The subtitle provider returned a web page instead of a subtitle.", 502);
    const vtt = normalizeSubtitleToVtt(text, subtitle.fileName);

    return new Response(vtt, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFileName(subtitle.fileName.replace(/\.[^.]+$/, ".vtt"))}"`,
        ...publicCacheHeaders({ browserSeconds: 3600, edgeSeconds: 86_400 }),
        ...rateLimitHeaders(rate),
      },
    });
  } catch (reason) {
    const status = reason instanceof SubtitleRequestError ? reason.status : 502;
    return Response.json({ error: reason instanceof Error ? reason.message : "Subtitle could not be prepared." }, { status, headers: rateLimitHeaders(rate) });
  }
}

async function fetchTrustedSubtitle(value: string) {
  let target = trustedUrl(value);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(target, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept: "application/zip,text/vtt,text/plain,application/x-subrip,*/*;q=0.5",
        "user-agent": "Mozilla/5.0 SarvNema Subtitle Player",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new SubtitleRequestError("Subtitle redirect is incomplete.", 502);
      target = trustedUrl(new URL(location, target).toString());
      continue;
    }
    if (!response.ok) throw new SubtitleRequestError(`Subtitle provider returned ${response.status}.`, response.status === 404 ? 404 : 502);
    return response;
  }
  throw new SubtitleRequestError("Subtitle redirected too many times.", 502);
}

function trustedUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SubtitleRequestError("Subtitle URL is invalid.", 400);
  }
  if (!TRUSTED_HOSTS.has(url.hostname.toLowerCase()) || !["http:", "https:"].includes(url.protocol)) {
    throw new SubtitleRequestError("This subtitle host is not trusted.", 403);
  }
  url.username = "";
  url.password = "";
  return url;
}

function extractSubtitle(archive: Uint8Array) {
  const files = unzipSync(archive, {
    filter: (file) => SUBTITLE_FILE.test(file.name) && file.originalSize > 0 && file.originalSize <= MAX_SUBTITLE_BYTES,
  });
  const entries = Object.entries(files)
    .filter(([name, bytes]) => SUBTITLE_FILE.test(name) && bytes.byteLength > 0)
    .sort(([leftName, leftBytes], [rightName, rightBytes]) => fileScore(rightName, rightBytes) - fileScore(leftName, leftBytes));
  const selected = entries[0];
  if (!selected) throw new SubtitleRequestError("No supported subtitle was found inside the package.", 422);
  return { fileName: selected[0], bytes: selected[1] };
}

function fileScore(name: string, bytes: Uint8Array) {
  const lower = name.toLowerCase();
  const format = lower.endsWith(".vtt") ? 50 : lower.endsWith(".srt") ? 40 : lower.endsWith(".ass") || lower.endsWith(".ssa") ? 30 : 10;
  const language = /farsi|persian|\.fa\b/.test(lower) ? 30 : /english|\.en\b/.test(lower) ? 15 : 0;
  const penalty = /sample|forced|commentary|sdh|hearing/.test(lower) ? 20 : 0;
  return format + language - penalty + Math.min(20, bytes.byteLength / 20_000);
}

function isZip(bytes: Uint8Array, contentType: string, fileName: string) {
  return contentType.includes("zip") || fileName.toLowerCase().endsWith(".zip") || bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function fileNameFromResponse(response: Response) {
  const disposition = response.headers.get("content-disposition") ?? "";
  return disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ? decodeURIComponent(disposition.match(/filename\*=UTF-8''([^;]+)/i)![1]) : disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "";
}

function fileNameFromUrl(value: string) {
  try { return decodeURIComponent(new URL(value).pathname.split("/").pop() ?? ""); } catch { return ""; }
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").slice(-120) || "subtitle.vtt";
}

class SubtitleRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
