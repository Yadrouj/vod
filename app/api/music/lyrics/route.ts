import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MAX_LYRICS_BYTES, parseLrc } from "@/lib/lyrics-timing";
import { checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/runtime-cache";

export const dynamic = "force-dynamic";

/** Operator-supplied licensed/original/public-domain lyrics only. No third-party
 * lyric scraping, no full music-index read, and no untrusted remote fetch. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[\p{L}\p{N}_-]{1,180}$/u.test(id)) return Response.json({ found: false, lines: [] }, { status: 400 });
  const rate = checkRateLimit(`music-lyrics:${clientIp(request)}`, 60, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  const file = path.join(process.env.LICENSED_LYRICS_DIR || path.join(process.cwd(), "data", "licensed-lyrics"), `${id}.json`);
  try {
    if ((await stat(file)).size > MAX_LYRICS_BYTES * 2) throw new Error("oversized lyric record");
    const record = JSON.parse(await readFile(file, "utf8"));
    if (!["licensed", "original", "public-domain"].includes(record.rights) || !record.attribution || typeof record.lrc !== "string") throw new Error("rights metadata missing");
    const lines = parseLrc(record.lrc);
    const sourceUrl = typeof record.sourceUrl === "string" && /^https:\/\//.test(record.sourceUrl) ? record.sourceUrl : undefined;
    return Response.json({ found: lines.length > 0, lines, sourceUrl, attribution: String(record.attribution).slice(0, 300), timing: lines.some(line => line.start !== undefined) ? "timed" : "plain" }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    return Response.json({ found: false, lines: [], message: missing ? "متن مجاز این آهنگ هنوز موجود نیست؛ فایل LRC یا متن خودتان را اضافه کنید." : "فایل متن نیاز به بررسی دارد." }, { status: missing ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
