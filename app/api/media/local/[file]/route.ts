import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const CACHE_DIR = path.join(process.cwd(), ".media-cache");
const MANIFEST_FILE = path.join(process.cwd(), "public", "data", "musclewiki-video-manifest.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function safeFileName(file: string): string | null {
  return /^[a-f0-9]{40}\.mp4$/.test(file) ? file : null;
}

function cacheFileForUrl(url: string): string {
  return `${createHash("sha1").update(url).digest("hex")}.mp4`;
}

function responseBody(stream: ReturnType<typeof Readable.toWeb>): BodyInit {
  return stream as unknown as BodyInit;
}

async function findSourceUrl(file: string): Promise<string | null> {
  try {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_FILE, "utf8")) as { url: string; cacheFile: string }[];
    return manifest.find((item) => item.cacheFile === file)?.url ?? null;
  } catch {
    return null;
  }
}

async function ensureCached(file: string): Promise<string | null> {
  const dest = path.join(CACHE_DIR, file);
  try {
    await fs.access(dest);
    return dest;
  } catch {
    /* miss */
  }

  const sourceUrl = await findSourceUrl(file);
  if (!sourceUrl || cacheFileForUrl(sourceUrl) !== file) return null;

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const tmp = path.join(tmpdir(), `mw-local-${process.pid}-${Date.now()}.mp4`);
  const curlBin = process.env.MEDIA_CURL || "curl";
  const impersonate = curlBin !== "curl";
  const args = impersonate
    ? ["-L", "-s", "--fail", "--max-time", "120", "-H", "Referer: https://musclewiki.com/", "-H", "Range: bytes=0-", "-o", tmp, sourceUrl]
    : [
        "-L",
        "-s",
        "--fail",
        "--compressed",
        "--max-time",
        "120",
        "-A",
        UA,
        "-H",
        "Referer: https://musclewiki.com/",
        "-H",
        "Range: bytes=0-",
        "-o",
        tmp,
        sourceUrl,
      ];
  await execFileP(curlBin, args, { maxBuffer: 1024 * 1024 });
  await fs.rename(tmp, dest);
  return dest;
}

async function videoResponse(filePath: string, range: string | null): Promise<Response> {
  const { size: total } = await fs.stat(filePath);
  const base: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const match = range ? /bytes=(\d+)-(\d*)/.exec(range) : null;
  if (match) {
    const start = parseInt(match[1], 10);
    const hasEnd = match[2] !== "";
    const end = hasEnd ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    const isFullFile = start === 0 && end >= total - 1;
    if (!isFullFile) {
      if (Number.isNaN(start) || start >= total || start > end) {
        return new Response(null, {
          status: 416,
          headers: { ...base, "Content-Range": `bytes */${total}` },
        });
      }
      const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
      return new Response(responseBody(stream), {
        status: 206,
        headers: {
          ...base,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(filePath));
  return new Response(responseBody(stream), {
    status: 200,
    headers: { ...base, "Content-Length": String(total) },
  });
}

export async function GET(request: Request, props: { params: Promise<{ file: string }> }) {
  const { file } = await props.params;
  const safe = safeFileName(file);
  if (!safe) return new Response("bad file", { status: 400 });

  try {
    const filePath = await ensureCached(safe);
    if (!filePath) return new Response("not found", { status: 404 });
    return videoResponse(filePath, request.headers.get("range"));
  } catch {
    return new Response("video unavailable", { status: 502 });
  }
}
