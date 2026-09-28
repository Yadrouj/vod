import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { MusicSource, MusicTrack } from "@/lib/music-types";
import { musicAttachment } from "@/lib/music-download";

const AUDIO_CONTENT_TYPE = "audio/mpeg";

/**
 * Streams one catalogued Melodify file from the read-only host mount.
 * The filename comes from the imported catalog, never from a request, and is
 * still checked against the configured root before opening it.
 */
export async function streamMelodifyFile(request: Request, track: MusicTrack, source: MusicSource, download = false) {
  if (source.provider !== "melodify") return null;
  const root = process.env.MELODIFY_LIBRARY_DIR?.trim();
  const filename = source.basePath?.trim();
  if (!root || !filename || filename.includes("\0") || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") return null;

  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, filename);
  if (path.dirname(filePath) !== rootPath || path.basename(filePath) !== filename || !/\.mp3$/iu.test(filename)) return null;

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;

  const range = parseRange(request.headers.get("range"), info.size);
  if (range === "invalid") {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}`, "Accept-Ranges": "bytes" } });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? Math.max(0, info.size - 1);
  const stream = createReadStream(filePath, { start, end });
  const headers = new Headers({
    "Content-Type": AUDIO_CONTENT_TYPE,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400, immutable",
    "X-Content-Type-Options": "nosniff",
    ETag: `W/\"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}\"`,
    "Last-Modified": info.mtime.toUTCString(),
  });
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
  if (download) headers.set("Content-Disposition", musicAttachment(track.persianTitle || track.title || "SarvNema", `https://sarvnema.local/${encodeURIComponent(filename)}`));
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
}

function parseRange(value: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (!value) return null;
  const match = value.match(/^bytes=(\d*)-(\d*)$/u);
  if (!match) return "invalid";
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2] || 0));
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return "invalid";
  end = Math.min(end, size - 1);
  return { start, end };
}
