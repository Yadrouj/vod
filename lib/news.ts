import { readFile } from "node:fs/promises";
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

export async function loadVodNews(): Promise<VodNewsPayload> {
  try {
    return JSON.parse(
      await readFile(path.join(process.cwd(), "public", "data", "vod-news.json"), "utf8")
    ) as VodNewsPayload;
  } catch {
    return fallbackNews;
  }
}
