import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export type VodNewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: "release" | "episodes" | "animation" | "festival" | "industry" | "imdb";
  imageUrl?: string | null;
  tags: string[];
};

export type VodNewsPayload = {
  generatedAt: string;
  sources: string[];
  items: VodNewsItem[];
  boxOffice?: { reportedAt: string; periodLabel: string; metric: "weekly-sales"; unit: string; sourceUrl: string; sourceName: string; rows: { rank: number; title: string; salesToman: number; audience: number }[] } | null;
};

const fallbackNews: VodNewsPayload = {
  generatedAt: new Date(0).toISOString(),
  sources: [],
  items: [],
};
const newsFile = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"), "vod-news.json");
let cachedNews: { modifiedAt: number; value: VodNewsPayload } | null = null;

export async function loadVodNews(): Promise<VodNewsPayload> {
  try {
    const info = await stat(newsFile);
    if (cachedNews?.modifiedAt === info.mtimeMs) return freshNews(cachedNews.value);
    const value = JSON.parse(await readFile(newsFile, "utf8")) as VodNewsPayload;
    cachedNews = { modifiedAt: info.mtimeMs, value };
    return freshNews(value);
  } catch {
    return freshNews(cachedNews?.value ?? fallbackNews);
  }
}

export function freshNews(value: VodNewsPayload, now = Date.now()): VodNewsPayload {
  const age = now - Date.parse(value.boxOffice?.reportedAt || "");
  return { ...value, boxOffice: value.boxOffice?.metric === "weekly-sales" && age >= 0 && age <= 14 * 86400000 ? value.boxOffice : null, items: value.items.filter(item => {
    const at = Date.parse(item.publishedAt);
    return Number.isFinite(at) && at <= now + 300000 && now - at <= 7 * 86400000;
  }) };
}
