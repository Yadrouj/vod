import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodCard } from "./types";

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

export function selectFreshReleaseUpdates(items: ReleaseUpdate[], limit = 80, now = new Date()) {
  const currentYear = now.getUTCFullYear();
  const recentEventCutoff = now.getTime() - 45 * 24 * 60 * 60 * 1_000;
  const recentReleaseCutoff = now.getTime() - 120 * 24 * 60 * 60 * 1_000;
  const seen = new Set<string>();

  return [...items]
    .filter((item) => {
      const eventTime = Date.parse(item.eventAt);
      if (!Number.isFinite(eventTime) || eventTime < recentEventCutoff) return false;
      const releaseTime = Date.parse(item.releaseDate ?? "");
      const isCurrentRelease = (item.year ?? 0) >= currentYear
        || (Number.isFinite(releaseTime) && releaseTime >= recentReleaseCutoff);
      if (item.kind !== "episode" && !isCurrentRelease) return false;
      const key = `${item.imdbCode ?? item.baseTitle}:${item.season ?? 0}:${item.episode ?? 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => Date.parse(right.eventAt) - Date.parse(left.eventAt))
    .slice(0, limit);
}

export function releaseUpdatesFromCatalog(items: VodCard[], limit = 80, now = new Date()): ReleaseUpdate[] {
  const currentYear = now.getUTCFullYear();
  const recentCutoff = now.getTime() - 45 * 24 * 60 * 60 * 1_000;
  const seen = new Set<string>();

  return [...items]
    .filter((item) => {
      if ((item.year ?? 0) < currentYear || item.linksCount < 1) return false;
      const updatedAt = newestValidDate(item.sourceUpdatedAt, item.catalogUpdatedAt);
      return updatedAt !== null && updatedAt.getTime() >= recentCutoff;
    })
    .sort((left, right) => {
      const rightDate = newestValidDate(right.sourceUpdatedAt, right.catalogUpdatedAt)?.getTime() ?? 0;
      const leftDate = newestValidDate(left.sourceUpdatedAt, left.catalogUpdatedAt)?.getTime() ?? 0;
      return rightDate - leftDate || (right.imdbRating ?? 0) - (left.imdbRating ?? 0);
    })
    .filter((item) => {
      if (seen.has(item.imdbCode)) return false;
      seen.add(item.imdbCode);
      return true;
    })
    .slice(0, limit)
    .map((item) => ({
      id: `catalog-fresh-${item.imdbCode}`,
      eventAt: (newestValidDate(item.sourceUpdatedAt, item.catalogUpdatedAt) ?? now).toISOString(),
      status: "available",
      kind: item.type === "series" ? "series" : "film",
      title: item.title,
      baseTitle: item.title,
      imdbCode: item.imdbCode,
      year: item.year,
      releaseDate: null,
      season: null,
      episode: null,
      href: `/${item.imdbCode}`,
      imdbUrl: `https://www.imdb.com/title/${item.imdbCode}/`,
      imageUrl: item.backdropUrl ?? item.posterUrl,
      sourceNames: item.source ? [item.source] : [],
      qualities: item.qualities,
      linksCount: item.linksCount,
      reason: "catalog-fresh",
    }));
}

function newestValidDate(...values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => Date.parse(value ?? ""))
    .filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}
