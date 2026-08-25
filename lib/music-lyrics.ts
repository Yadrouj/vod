import { TtlLruCache } from "@/lib/runtime-cache";

export type MusicLyricLine = { text: string; start?: number; end?: number };
export type MusicLyricsResult = { found: boolean; lines: MusicLyricLine[]; sourceUrl: string; message?: string };

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const lyricsCache = new TtlLruCache<string, MusicLyricsResult>(300, 6 * 60 * 60_000);

export async function scrapeMusicLyrics(sourceUrl: string): Promise<MusicLyricsResult> {
  const cached = lyricsCache.get(sourceUrl);
  if (cached) return cached;

  const response = await fetch(sourceUrl, {
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.2", "User-Agent": "SarvNema lyrics reader/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`The music source returned ${response.status}.`);
  const html = await readLimitedText(response);
  const lines = extractLyrics(html).map((text) => ({ text }));
  const result: MusicLyricsResult = { found: lines.length > 0, lines, sourceUrl };
  if (!result.lines.length) result.message = "Lyrics are not published on this source page yet.";
  lyricsCache.set(sourceUrl, result);
  return result;
}

function extractLyrics(html: string) {
  const candidates: string[] = [];
  const blockPattern = /<(?:div|section|article|p|td)[^>]*(?:id|class)=["'][^"']*(?:lyrics?|lyric|song[-_ ]?text|text[-_ ]?song|matn)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|article|p|td)>/giu;
  for (const match of html.matchAll(blockPattern)) candidates.push(match[1]);
  const cleaned = candidates.flatMap((candidate) => htmlToLines(candidate));
  return uniqueLines(cleaned).slice(0, 240);
}

function htmlToLines(value: string) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(?:p|div|section|article|li|tr)>/giu, "\n")
    .replace(/<[^>]+>/gu, "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => line.length >= 2 && line.length <= 240)
    .filter((line) => !isSourceNoise(line));
}

function isSourceNoise(line: string) {
  return /^(?:دانلود|download|موزیکفا|musicfa|منبع اثر|source|با ما همراه|کیفیت|lyrics?\s*:?)\b/iu.test(line)
    || /https?:\/\//iu.test(line)
    || /(?:320|128)\s*(?:kbps|کیفیت)/iu.test(line);
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/gu, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/giu, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'");
}

async function readLimitedText(response: Response) {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < MAX_HTML_BYTES) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      const remaining = MAX_HTML_BYTES - length;
      const selected = chunk.byteLength > remaining ? chunk.slice(0, remaining) : chunk;
      chunks.push(selected);
      length += selected.byteLength;
      if (selected.byteLength < chunk.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8").decode(bytes);
}
