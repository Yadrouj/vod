import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { applyDownloadBaseToItem } from "./download-settings";
import type { VodArchive, VodItem } from "./types";

export const loadVodArchive = cache(async (): Promise<VodArchive> => {
  const catalog = path.join(process.cwd(), "public", "data", "vod-catalog.json");
  const fallback = path.join(process.cwd(), "public", "data", "vod-archive-imdb.json");
  try {
    return JSON.parse(await readFile(catalog, "utf8")) as VodArchive;
  } catch {
    return JSON.parse(await readFile(fallback, "utf8")) as VodArchive;
  }
});

export async function findVodItem(id: string): Promise<VodItem | null> {
  const item = await findVodTitleFile(id);
  if (item) return applyDownloadBaseToItem(item);

  const archive = await loadVodArchive();
  const normalized = id.toLowerCase();
  const found =
    archive.items.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.imdbCode.toLowerCase() === normalized
    ) ?? null;

  return found ? applyDownloadBaseToItem(found) : null;
}

export function normalizeVodType(type: string): "movie" | "series" {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

const loadTitleMap = cache(async (): Promise<Record<string, string>> => {
  try {
    return JSON.parse(
      await readFile(path.join(process.cwd(), "public", "data", "title-map.json"), "utf8")
    ) as Record<string, string>;
  } catch {
    return {};
  }
});

async function findVodTitleFile(id: string): Promise<VodItem | null> {
  const normalized = id.toLowerCase();
  const map = await loadTitleMap();
  const fileId = map[normalized] ?? (/^tt\d+$/i.test(id) ? id : null);
  if (!fileId) return null;

  try {
    return JSON.parse(
      await readFile(path.join(process.cwd(), "public", "data", "titles", `${fileId}.json`), "utf8")
    ) as VodItem;
  } catch {
    return null;
  }
}
