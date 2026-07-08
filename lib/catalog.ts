import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VodArchive, VodItem } from "./types";

export const loadVodArchive = cache(async (): Promise<VodArchive> => {
  const file = path.join(process.cwd(), "public", "data", "vod-archive-imdb.json");
  return JSON.parse(await readFile(file, "utf8")) as VodArchive;
});

export async function findVodItem(id: string): Promise<VodItem | null> {
  const archive = await loadVodArchive();
  const normalized = id.toLowerCase();
  return (
    archive.items.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.imdbCode.toLowerCase() === normalized
    ) ?? null
  );
}

export function normalizeVodType(type: string): "movie" | "series" {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}
