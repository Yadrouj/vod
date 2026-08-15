import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export type ReleaseAvailability = "available" | "coming-soon";
export type ReleaseKind = "film" | "series" | "episode";

export type ReleaseUpdate = {
  id: string;
  eventAt: string;
  status: ReleaseAvailability;
  kind: ReleaseKind;
  title: string;
  baseTitle: string;
  imdbCode: string | null;
  year: number | null;
  releaseDate: string | null;
  season: number | null;
  episode: number | null;
  href: string | null;
  imdbUrl: string | null;
  imageUrl: string | null;
  sourceNames: string[];
  qualities: string[];
  linksCount: number;
  reason: string;
};

export type ReleaseUpdatesPayload = {
  generatedAt: string;
  sources: string[];
  bootstrap: boolean;
  summary: {
    catalogTitles: number;
    available: number;
    comingSoon: number;
    newEvents: number;
    imdbCandidates: number;
  };
  items: ReleaseUpdate[];
};

const fallback: ReleaseUpdatesPayload = {
  generatedAt: new Date(0).toISOString(),
  sources: [],
  bootstrap: true,
  summary: { catalogTitles: 0, available: 0, comingSoon: 0, newEvents: 0, imdbCandidates: 0 },
  items: [],
};
const file = path.join(process.cwd(), "public", "data", "vod-updates.json");
let cached: { modifiedAt: number; value: ReleaseUpdatesPayload } | null = null;

export async function loadReleaseUpdates(): Promise<ReleaseUpdatesPayload> {
  try {
    const info = await stat(file);
    if (cached?.modifiedAt === info.mtimeMs) return cached.value;
    const value = JSON.parse(await readFile(file, "utf8")) as ReleaseUpdatesPayload;
    cached = { modifiedAt: info.mtimeMs, value };
    return value;
  } catch {
    return fallback;
  }
}
