import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { applyDownloadBaseToItem } from "./download-settings";
import type { VodArchive, VodItem } from "./types";

let archivePromise: Promise<VodArchive> | null = null;
let titleMapPromise: Promise<Record<string, string>> | null = null;
const titleFilePromises = new Map<string, Promise<VodItem | null>>();

export function loadVodArchive(): Promise<VodArchive> {
  archivePromise ??= loadArchiveFile();
  return archivePromise;
}

async function loadArchiveFile(): Promise<VodArchive> {
  const catalog = path.join(process.cwd(), "public", "data", "vod-catalog.json");
  const fallback = path.join(process.cwd(), "public", "data", "vod-archive-imdb.json");
  try {
    return JSON.parse(await readFile(catalog, "utf8")) as VodArchive;
  } catch {
    return JSON.parse(await readFile(fallback, "utf8")) as VodArchive;
  }
}

export const findVodItem = cache(async (id: string): Promise<VodItem | null> => {
  const item = await findVodTitleFile(id);
  return item ? applyDownloadBaseToItem(item) : null;
});

export function normalizeVodType(type: string): "movie" | "series" {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

function loadTitleMap(): Promise<Record<string, string>> {
  titleMapPromise ??= readFile(path.join(process.cwd(), "public", "data", "title-map.json"), "utf8")
    .then((data) => JSON.parse(data) as Record<string, string>)
    .catch(() => ({}));
  return titleMapPromise;
}

async function findVodTitleFile(id: string): Promise<VodItem | null> {
  const normalized = id.toLowerCase();
  const map = await loadTitleMap();
  const fileId = map[normalized] ?? (/^tt\d+$/i.test(id) ? id : null);
  if (!fileId) return null;

  const cacheKey = fileId.toLowerCase();
  let promise = titleFilePromises.get(cacheKey);
  if (!promise) {
    promise = readFile(path.join(process.cwd(), "public", "data", "titles", `${fileId}.json`), "utf8")
      .then((data) => JSON.parse(data) as VodItem)
      .catch(() => null);
    titleFilePromises.set(cacheKey, promise);
    if (titleFilePromises.size > 256) {
      const oldest = titleFilePromises.keys().next().value as string | undefined;
      if (oldest) titleFilePromises.delete(oldest);
    }
  }
  return promise;
}
