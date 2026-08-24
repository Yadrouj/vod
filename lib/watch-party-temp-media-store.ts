import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { finished } from "node:stream/promises";
import type { IncomingMessage } from "node:http";
import Busboy from "busboy";
import {
  cleanPersonalEpisode,
  cleanPersonalMediaTitle,
  inferPersonalMediaKind,
  mimeTypeForPersonalMedia,
  type PersonalMediaFields,
  type PersonalMediaKind,
  type StoredPersonalMedia,
} from "@/lib/watch-party-personal-media";

export type { StoredPersonalMedia } from "@/lib/watch-party-personal-media";

export class TempPartyMediaError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "TempPartyMediaError";
  }
}

export type TempPartyMediaUploadContext = {
  roomId: string;
  ownerId: string;
  ownerName: string;
};

export const TEMP_MEDIA_TTL_MS = Math.max(15 * 60_000, Number(process.env.WATCH_PARTY_MEDIA_TTL_MS) || 3 * 60 * 60_000);
export const MAX_TEMP_AUDIO_BYTES = Math.max(8 * 1024 * 1024, Number(process.env.WATCH_PARTY_MAX_AUDIO_UPLOAD_BYTES) || 150 * 1024 * 1024);
export const MAX_TEMP_VIDEO_BYTES = Math.max(32 * 1024 * 1024, Number(process.env.WATCH_PARTY_MAX_VIDEO_UPLOAD_BYTES) || 750 * 1024 * 1024);
const storageRoot = resolve(process.env.WATCH_PARTY_MEDIA_DIR || join(process.cwd(), ".media-cache", "party-media"));
const records = new Map<string, StoredPersonalMedia>();
let initialized: Promise<void> | null = null;

function metadataPath(id: string) {
  return join(storageRoot, `${id}.json`);
}

function filePath(record: StoredPersonalMedia) {
  return join(storageRoot, record.fileName);
}

function safeRecord(value: unknown): StoredPersonalMedia | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<StoredPersonalMedia>;
  if (!/^[a-f0-9-]{20,80}$/i.test(String(record.id ?? ""))) return null;
  if (!/^[a-zA-Z0-9_-]{20,160}$/.test(String(record.accessKey ?? ""))) return null;
  if (!/^[a-f0-9-]{20,80}$/i.test(String(record.fileName ?? "").replace(/\.[a-z0-9]{2,8}$/i, ""))) return null;
  if (record.mediaKind !== "audio" && record.mediaKind !== "video") return null;
  if (!Number.isFinite(record.bytes) || Number(record.bytes) < 0 || !Number.isFinite(record.createdAt) || !Number.isFinite(record.expiresAt)) return null;
  const title = cleanPersonalMediaTitle(record.title, "Shared media");
  const originalName = cleanPersonalMediaTitle(record.originalName, "Shared media");
  const ownerName = cleanPersonalMediaTitle(record.ownerName, "Guest");
  if (!String(record.roomId ?? "") || !String(record.ownerId ?? "")) return null;
  return {
    id: String(record.id),
    accessKey: String(record.accessKey),
    roomId: String(record.roomId).slice(0, 100),
    ownerId: String(record.ownerId).slice(0, 100),
    ownerName,
    title,
    originalName,
    fileName: String(record.fileName),
    mimeType: mimeTypeForPersonalMedia(String(record.fileName), record.mimeType),
    mediaKind: record.mediaKind,
    season: cleanPersonalEpisode(record.season),
    episode: cleanPersonalEpisode(record.episode),
    bytes: Number(record.bytes),
    createdAt: Number(record.createdAt),
    expiresAt: Number(record.expiresAt),
  };
}

async function persistRecord(record: StoredPersonalMedia) {
  const target = metadataPath(record.id);
  const temporary = `${target}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(record), "utf8");
  await rename(temporary, target);
}

async function removeRecord(record: StoredPersonalMedia) {
  records.delete(record.id);
  await Promise.allSettled([rm(filePath(record), { force: true }), rm(metadataPath(record.id), { force: true })]);
}

async function loadRecords() {
  await mkdir(storageRoot, { recursive: true });
  const entries = await readdir(storageRoot, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && /^[a-f0-9-]{20,80}\.json$/i.test(entry.name))
    .map(async (entry) => {
      try {
        const candidate = safeRecord(JSON.parse(await readFile(join(storageRoot, entry.name), "utf8")));
        if (!candidate || candidate.expiresAt <= Date.now()) {
          if (candidate) await removeRecord(candidate);
          else await rm(join(storageRoot, entry.name), { force: true });
          return;
        }
        await stat(filePath(candidate));
        records.set(candidate.id, candidate);
      } catch {
        await rm(join(storageRoot, entry.name), { force: true });
      }
    }));
}

export async function initializeTempPartyMediaStore() {
  initialized ??= loadRecords();
  await initialized;
}

function maxBytesFor(kind: PersonalMediaKind) {
  return kind === "audio" ? MAX_TEMP_AUDIO_BYTES : MAX_TEMP_VIDEO_BYTES;
}

export function tempUploadLimit(kind: PersonalMediaKind) {
  return maxBytesFor(kind);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function getTempPartyMedia(id: string, accessKey?: string | null) {
  await initializeTempPartyMediaStore();
  const record = records.get(id);
  if (!record || !accessKey || !safeEqual(record.accessKey, accessKey)) return null;
  if (record.expiresAt <= Date.now()) {
    await removeRecord(record);
    return null;
  }
  try {
    const info = await stat(filePath(record));
    if (!info.isFile()) return null;
    return { record, path: filePath(record), size: info.size };
  } catch {
    await removeRecord(record);
    return null;
  }
}

export async function getTempPartyMediaForRoom(id: string, roomId: string) {
  await initializeTempPartyMediaStore();
  const record = records.get(id);
  if (!record || record.roomId !== roomId) return null;
  if (record.expiresAt <= Date.now()) {
    await removeRecord(record);
    return null;
  }
  return record;
}

export function createTempPartyMediaReadStream(record: StoredPersonalMedia, start?: number, end?: number) {
  return createReadStream(filePath(record), start === undefined ? undefined : { start, end });
}

export async function cleanupExpiredTempPartyMedia(now = Date.now()) {
  await initializeTempPartyMediaStore();
  const expired = [...records.values()].filter((record) => record.expiresAt <= now);
  await Promise.all(expired.map((record) => removeRecord(record)));
  return expired.length;
}

function uploadFieldsFrom(values: Map<string, string>): PersonalMediaFields {
  const kind = values.get("mediaKind");
  return {
    title: values.get("title") ?? null,
    mediaKind: kind === "audio" || kind === "video" ? kind : null,
    season: cleanPersonalEpisode(values.get("season")),
    episode: cleanPersonalEpisode(values.get("episode")),
  };
}

/** Streams one browser-playable audio/video file to the temporary room store. */
export async function saveTempPartyMediaUpload(request: IncomingMessage, context: TempPartyMediaUploadContext) {
  await initializeTempPartyMediaStore();
  const contentType = String(request.headers["content-type"] ?? "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) throw new TempPartyMediaError("Use multipart form data for the temporary upload.", 415);
  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_TEMP_VIDEO_BYTES + 1_048_576) throw new TempPartyMediaError("This temporary file is larger than the room upload limit.", 413);

  const id = randomUUID();
  const fields = new Map<string, string>();
  let failure: TempPartyMediaError | null = null;
  let originalName = "";
  let mediaKind: PersonalMediaKind | null = null;
  let fileName = "";
  let mimeType = "";
  let bytes = 0;
  let stagingPath = "";
  let writeDone: Promise<void> | null = null;
  let receivedFile = false;

  const discardStaging = async () => {
    if (stagingPath) await rm(stagingPath, { force: true }).catch(() => undefined);
  };

  return new Promise<StoredPersonalMedia>((resolvePromise, rejectPromise) => {
    const rejectWithCleanup = async (error: TempPartyMediaError) => {
      await discardStaging();
      rejectPromise(error);
    };
    let parser: ReturnType<typeof Busboy>;
    try {
      parser = Busboy({
        headers: request.headers,
        limits: { files: 1, fields: 5, parts: 6, fieldNameSize: 30, fieldSize: 300, fileSize: MAX_TEMP_VIDEO_BYTES },
      });
    } catch {
      void rejectWithCleanup(new TempPartyMediaError("The upload form is malformed.", 400));
      return;
    }

    parser.on("field", (name, value) => {
      if (["title", "mediaKind", "season", "episode"].includes(name)) fields.set(name, value);
    });
    parser.on("filesLimit", () => { failure ??= new TempPartyMediaError("Upload one file at a time.", 400); });
    parser.on("fieldsLimit", () => { failure ??= new TempPartyMediaError("Too many upload fields.", 400); });
    parser.on("partsLimit", () => { failure ??= new TempPartyMediaError("The upload form has too many parts.", 400); });
    parser.on("file", (name, file, info) => {
      if (name !== "file" || receivedFile) {
        failure ??= new TempPartyMediaError("Upload one media file in the file field.", 400);
        file.resume();
        return;
      }
      receivedFile = true;
      originalName = basename(info.filename || "shared-media").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 180);
      mediaKind = inferPersonalMediaKind(originalName, info.mimeType);
      if (!mediaKind) {
        failure = new TempPartyMediaError("Use a browser-playable MP3, M4A, WAV, OGG, MP4, WebM, or OGV file.", 415);
        file.resume();
        return;
      }
      const extension = extname(originalName).toLowerCase();
      fileName = `${id}${extension}`;
      mimeType = mimeTypeForPersonalMedia(originalName, info.mimeType);
      stagingPath = join(storageRoot, `.${id}.${randomBytes(4).toString("hex")}.part`);
      const writer = createWriteStream(stagingPath, { flags: "wx" });
      writeDone = finished(writer);
      file.on("limit", () => { failure ??= new TempPartyMediaError("This temporary file is larger than the room upload limit.", 413); });
      file.on("data", (chunk: Buffer) => { bytes += chunk.length; });
      file.on("error", () => { failure ??= new TempPartyMediaError("The upload stream ended unexpectedly.", 400); });
      writer.on("error", () => { failure ??= new TempPartyMediaError("SarvNema could not save the temporary media file.", 500); });
      file.pipe(writer);
    });
    parser.on("error", () => { failure ??= new TempPartyMediaError("The upload stream could not be read.", 400); });
    parser.on("close", () => {
      void (async () => {
        try {
          if (writeDone) await writeDone;
          if (failure) throw failure;
          if (!receivedFile || !mediaKind || !stagingPath || !fileName) throw new TempPartyMediaError("Choose one playable media file first.", 400);
          if (bytes <= 0) throw new TempPartyMediaError("The uploaded file is empty.", 400);
          if (bytes > maxBytesFor(mediaKind)) throw new TempPartyMediaError(`This ${mediaKind} exceeds the temporary room limit.`, 413);
          const input = uploadFieldsFrom(fields);
          if (input.mediaKind && input.mediaKind !== mediaKind) throw new TempPartyMediaError("The selected media type does not match the uploaded file.", 400);
          const now = Date.now();
          const record: StoredPersonalMedia = {
            id,
            accessKey: randomBytes(24).toString("base64url"),
            roomId: context.roomId,
            ownerId: context.ownerId,
            ownerName: cleanPersonalMediaTitle(context.ownerName, "Guest"),
            title: cleanPersonalMediaTitle(input.title, originalName.replace(/\.[a-z0-9]{2,8}$/i, "")),
            originalName,
            fileName,
            mimeType,
            mediaKind,
            season: input.season ?? null,
            episode: input.episode ?? null,
            bytes,
            createdAt: now,
            expiresAt: now + TEMP_MEDIA_TTL_MS,
          };
          await rename(stagingPath, filePath(record));
          stagingPath = "";
          records.set(record.id, record);
          await persistRecord(record);
          resolvePromise(record);
        } catch (error) {
          const issue = error instanceof TempPartyMediaError ? error : new TempPartyMediaError("SarvNema could not finish the temporary upload.", 500);
          await discardStaging();
          rejectPromise(issue);
        }
      })();
    });
    request.on("aborted", () => { failure ??= new TempPartyMediaError("The upload was cancelled before it finished.", 499); });
    request.on("error", () => { failure ??= new TempPartyMediaError("The upload connection was interrupted.", 400); });
    request.pipe(parser);
  });
}
