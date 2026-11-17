import { checkRateLimit, clientIp, publicCacheHeaders, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";
import { decodeSubtitleBytes, normalizeSubtitleToVtt } from "@/lib/subtitle-format";
import { unpackSubtitle, MAX_SUBTITLE_BYTES } from '@/lib/subtitle-package';
import { subtitleLanguage } from '@/lib/subtitle-matching';

export const dynamic = "force-dynamic";

const MAX_COMPRESSED_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TRUSTED_HOSTS = new Set([
  "subzone.ir",
  "www.subzone.ir",
  "media.sub-api.ir",
  "sr1.moviesho.com",
]);
const SUBTITLE_FILE = /\.(vtt|srt|ass|ssa|txt)$/i;

export async function GET(request: Request) {
  const rate = checkRateLimit(`subtitle-track:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  const params = new URL(request.url).searchParams;
  const remoteUrl = params.get("url")?.trim();
  if (!remoteUrl) return Response.json({ error: "Subtitle URL is required." }, { status: 400 });
  const language = subtitleLanguage(params.get('language'));
  const positive = (name: string) => { const value = params.get(name); return value === null ? null : /^\d{1,3}$/.test(value) && Number(value) > 0 ? Number(value) : NaN; };
  const season = positive('season'), episode = positive('episode');
  if (params.has('language') && !language || Number.isNaN(season) || Number.isNaN(episode) || episode && !season) return Response.json({ error: 'Only Persian/English and a valid season/episode are supported.' }, { status: 400 });

  try {
    const response = await fetchTrustedSubtitle(remoteUrl);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_COMPRESSED_BYTES) throw new SubtitleRequestError("Subtitle package is too large.", 413);

    const reader = response.body?.getReader(), chunks: Uint8Array[] = []; let total = 0;
    try {
      while (reader) { const { value, done } = await reader.read(); if (done) break; total += value.length; if (total > MAX_COMPRESSED_BYTES) throw new SubtitleRequestError('Subtitle package is too large.', 413); chunks.push(value); }
    } finally { await reader?.cancel(); }
    const bytes = new Uint8Array(Buffer.concat(chunks));
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const fileName = fileNameFromResponse(response) || fileNameFromUrl(response.url) || "subtitle.srt";
    let subtitle: { bytes: Uint8Array; fileName: string };
    try { subtitle = unpackSubtitle(bytes, fileName, { language, season, episode }, contentType); }
    catch (error) { throw new SubtitleRequestError(error instanceof Error ? error.message : 'No matching subtitle file.', 422); }
    if (subtitle.bytes.byteLength > MAX_SUBTITLE_BYTES) throw new SubtitleRequestError("Subtitle file is too large.", 413);

    const text = decodeSubtitleBytes(subtitle.bytes);
    if (/^\s*<!doctype html|^\s*<html/i.test(text)) throw new SubtitleRequestError("The subtitle provider returned a web page instead of a subtitle.", 502);
    const vtt = normalizeSubtitleToVtt(text, subtitle.fileName);

    return new Response(vtt, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        ...(language ? { 'X-Subtitle-Language': language } : {}),
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
      await response.body?.cancel();
      if (!location) throw new SubtitleRequestError("Subtitle redirect is incomplete.", 502);
      target = trustedUrl(new URL(location, target).toString());
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new SubtitleRequestError(`Subtitle provider returned ${response.status}.`, response.status === 404 ? 404 : 502); }
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
  if (!TRUSTED_HOSTS.has(url.hostname.toLowerCase()) || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
    throw new SubtitleRequestError("This subtitle host is not trusted.", 403);
  }
  if (url.hostname.toLowerCase() === "sr1.moviesho.com" && !SUBTITLE_FILE.test(url.pathname)) {
    throw new SubtitleRequestError("Only subtitle files can be loaded from this source.", 403);
  }
  return url;
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
