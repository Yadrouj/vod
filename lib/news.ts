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
};

const fallbackNews: VodNewsPayload = {
  generatedAt: new Date(0).toISOString(),
  sources: [],
  items: [],
};
const newsFile = path.join(process.cwd(), "public", "data", "vod-news.json");
let cachedNews: { modifiedAt: number; value: VodNewsPayload } | null = null;

export async function loadVodNews(): Promise<VodNewsPayload> {
  try {
    const info = await stat(newsFile);
    if (cachedNews?.modifiedAt === info.mtimeMs) return cachedNews.value;
    const value = JSON.parse(await readFile(newsFile, "utf8")) as VodNewsPayload;
    cachedNews = { modifiedAt: info.mtimeMs, value };
    return value;
  } catch {
    return fallbackNews;
  }
}
