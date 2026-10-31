import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const CHANNEL_DOCUMENTS = ["state", "status"] as const;
export type ChannelDocument = (typeof CHANNEL_DOCUMENTS)[number];

/** Catalogue files the remote publisher may read. Anything else is a 404. */
const CHANNEL_DATA_FILES: Record<string, string> = {
  "vod-updates": "vod-updates.json",
  "music-index": "music-index.json",
  "melodify-library": "melodify-library.json",
  "imdb-trending": "imdb-trending.json",
};

const documentRoot = () => process.env.TELEGRAM_CHANNEL_DATA_DIR || path.join(process.cwd(), "data", "telegram-channel");
const dataRoot = () => process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data");
const documentPath = (name: ChannelDocument) => path.join(documentRoot(), `${name}.json`);

export const isChannelDocument = (name: string | null): name is ChannelDocument =>
  CHANNEL_DOCUMENTS.includes(name as ChannelDocument);

export function channelDataFile(name: string) {
  return Object.hasOwn(CHANNEL_DATA_FILES, name) ? path.join(dataRoot(), CHANNEL_DATA_FILES[name]) : null;
}

export async function channelDataTag(file: string) {
  const info = await stat(file);
  return `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;
}

/** Returns the raw JSON text, or null when the publisher has never saved this document. */
export async function readChannelDocument(name: ChannelDocument) {
  try {
    return await readFile(documentPath(name), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Atomic, so a crash or a dropped upload can never leave half a publisher state. */
export async function writeChannelDocument(name: ChannelDocument, json: string) {
  await mkdir(documentRoot(), { recursive: true });
  const target = documentPath(name);
  const temporary = `${target}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    await writeFile(temporary, json, { mode: 0o600 });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
