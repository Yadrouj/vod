import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type VodLink = {
  label: string;
  url: string;
  size: string | null;
  group: string;
  quality: string | null;
  release: string | null;
};

export type VodItem = {
  id: string;
  title: string;
  imdbCode: string;
  imdbUrl: string | null;
  type: string;
  year: number | null;
  imdbVotes: number | null;
  imdbRating: number | null;
  groups: string[];
  qualities: string[];
  links: VodLink[];
  genres?: string[];
  runtimeMinutes?: number | null;
  originalTitle?: string | null;
  endYear?: number | null;
};

export type VodArchive = {
  sourceUrl: string;
  totalTitles: number;
  totalLinks: number;
  imdbMatchedTitles?: number;
  imdbMatchedRatings?: number;
  items: VodItem[];
};

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
