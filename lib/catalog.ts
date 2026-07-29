import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { applyDownloadBaseToItem } from "./download-settings";
import type { VodArchive, VodItem } from "./types";

const DATA_DIR = path.resolve(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"));
const FILE_CHECK_INTERVAL_MS = Math.max(5_000, Number(process.env.VOD_DATA_CHECK_INTERVAL_MS || 30_000));
const archiveCache: FileCache<VodArchive> = {};
const archiveFallbackCache: FileCache<VodArchive> = {};
const titleMapCache: FileCache<Record<string, string>> = {};
const titleFilePromises = new Map<string, Promise<VodItem | null>>();

export async function loadVodArchive(): Promise<VodArchive> {
  return loadArchiveFile();
}

async function loadArchiveFile(): Promise<VodArchive> {
  const catalog = path.join(DATA_DIR, "vod-catalog.json");
  const fallback = path.join(DATA_DIR, "vod-archive-imdb.json");
  try {
    return await loadFreshJson(catalog, archiveCache);
  } catch {
    return loadFreshJson(fallback, archiveFallbackCache);
  }
}

export const findVodItem = cache(async (id: string): Promise<VodItem | null> => {
  const item = await findVodTitleFile(id);
  return item ? applyDownloadBaseToItem(item) : null;
});

export function normalizeVodType(type: string): "movie" | "series" {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

async function loadTitleMap(): Promise<Record<string, string>> {
  const file = path.join(DATA_DIR, "title-map.json");
  const now = Date.now();
  if (
    titleMapCache.promise &&
    titleMapCache.checkedAt &&
    now - titleMapCache.checkedAt < FILE_CHECK_INTERVAL_MS
  ) {
    return titleMapCache.promise;
  }

  titleMapCache.checkedAt = now;
  try {
    const fileStat = await stat(file);
    if (!titleMapCache.promise || titleMapCache.mtimeMs !== fileStat.mtimeMs) {
      titleMapCache.mtimeMs = fileStat.mtimeMs;
      titleFilePromises.clear();
      titleMapCache.promise = readFile(file, "utf8")
        .then((data) => JSON.parse(data) as Record<string, string>)
        .catch((error) => {
          titleMapCache.promise = undefined;
          throw error;
        });
    }
    return titleMapCache.promise;
  } catch {
    return {};
  }
}

async function findVodTitleFile(id: string): Promise<VodItem | null> {
  const normalized = id.toLowerCase();
  const map = await loadTitleMap();
  const fileId = map[normalized] ?? (/^tt\d+$/i.test(id) ? id : null);
  if (!fileId) return null;

  const cacheKey = fileId.toLowerCase();
  let promise = titleFilePromises.get(cacheKey);
  if (!promise) {
    promise = readFile(path.join(DATA_DIR, "titles", `${fileId}.json`), "utf8")
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

type FileCache<T> = {
  checkedAt?: number;
  mtimeMs?: number;
  promise?: Promise<T>;
};

async function loadFreshJson<T>(file: string, cache: FileCache<T>): Promise<T> {
  const now = Date.now();
  if (cache.promise && cache.checkedAt && now - cache.checkedAt < FILE_CHECK_INTERVAL_MS) {
    return cache.promise;
  }

  cache.checkedAt = now;
  const fileStat = await stat(file);
  if (!cache.promise || cache.mtimeMs !== fileStat.mtimeMs) {
    cache.mtimeMs = fileStat.mtimeMs;
    cache.promise = readFile(file, "utf8")
      .then((data) => JSON.parse(data) as T)
      .catch((error) => {
        cache.promise = undefined;
        throw error;
      });
  }
  return cache.promise;
}
