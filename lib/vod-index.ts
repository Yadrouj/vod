import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodCard, VodCatalogIndex } from "./types";

export const HOME_SECTIONS = [
  "top-imdb",
  "recent-films",
  "best-series",
  "best-movies",
  "kids",
  "animation",
] as const;

export const SECTION_LABELS: Record<string, string> = {
  "top-imdb": "Top 250 IMDb",
  "persian-movies": "Persian Movies",
  "recent-films": "Recent Films",
  "best-series": "Best Series",
  "best-movies": "Best Movies",
  kids: "Kids",
  animation: "Animation",
};

export type BrowseParams = {
  section?: string;
  q?: string;
  type?: string;
  genre?: string;
  country?: string;
  language?: string;
  year?: string;
  quality?: string;
  minScore?: string;
  page?: string;
};

const DATA_DIR = path.resolve(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"));
const FILE_CHECK_INTERVAL_MS = Math.max(5_000, Number(process.env.VOD_DATA_CHECK_INTERVAL_MS || 30_000));
const indexCache: FileCache<VodCatalogIndex> = {};
const homeIndexCache: FileCache<VodCatalogIndex> = {};

export async function loadVodIndex(): Promise<VodCatalogIndex> {
  return loadFreshJson(path.join(DATA_DIR, "vod-index.json"), indexCache);
}

export async function loadVodHomeIndex(): Promise<VodCatalogIndex> {
  return loadFreshJson(path.join(DATA_DIR, "vod-home.json"), homeIndexCache)
    .catch(() => loadVodIndex());
}

export function pickHero(index: VodCatalogIndex): VodCard | null {
  return (
    index.sections.find((section) => section.id === "top-imdb")?.items.find((item) => item.backdropUrl) ??
    index.sections[0]?.items[0] ??
    index.items[0] ??
    null
  );
}

export function browseVodIndex(index: VodCatalogIndex, params: BrowseParams) {
  const pageSize = 30;
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const minScore = Number(params.minScore ?? "0") || 0;
  const needle = (params.q ?? "").trim().toLowerCase();
  const section = params.section || "all";
  const type = params.type || "all";
  const genre = params.genre || "All";
  const country = params.country || "All";
  const language = params.language || "All";
  const year = params.year || "All";
  const quality = params.quality || "All";

  const sectioned = selectSection(index.items, section);
  const filtered = sectioned.filter((item) => {
    const matchesQuery =
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.persianTitle?.toLowerCase().includes(needle) ||
      item.imdbCode.toLowerCase().includes(needle) ||
      item.genres.join(" ").toLowerCase().includes(needle) ||
      item.countries.join(" ").toLowerCase().includes(needle) ||
      item.languages.join(" ").toLowerCase().includes(needle) ||
      (item.persianGenres ?? []).join(" ").toLowerCase().includes(needle) ||
      (item.persianCountries ?? []).join(" ").toLowerCase().includes(needle) ||
      (item.persianLanguages ?? []).join(" ").toLowerCase().includes(needle);

    return (
      matchesQuery &&
      (type === "all" || item.type === type) &&
      (genre === "All" || item.genres.includes(genre)) &&
      (country === "All" || item.countries.includes(country)) &&
      (language === "All" || item.languages.includes(language)) &&
      (year === "All" || String(item.year) === year) &&
      (quality === "All" || item.qualities.includes(quality)) &&
      (item.imdbRating ?? 0) >= minScore
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * pageSize;

  return {
    section,
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages,
  };
}

export function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "All" && value !== "all" && value !== 0) {
      search.set(key, String(value));
    }
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

function selectSection(items: VodCard[], section: string) {
  if (section === "top-imdb") {
    return [...items].filter((item) => (item.imdbVotes ?? 0) >= 10000).sort(ratingSort).slice(0, 250);
  }
  if (section === "recent-films") {
    return [...items].filter((item) => item.type === "movie").sort(yearSort);
  }
  if (section === "persian-movies") {
    return [...items].filter(isPersianMovie).sort(yearSort);
  }
  if (section === "best-series") {
    return [...items].filter((item) => item.type === "series").sort(ratingSort);
  }
  if (section === "best-movies") {
    return [...items].filter((item) => item.type === "movie").sort(ratingSort);
  }
  if (section === "kids") {
    return [...items].filter((item) => hasGenre(item, ["family", "animation"])).sort(ratingSort);
  }
  if (section === "animation") {
    return [...items].filter((item) => hasGenre(item, ["animation"])).sort(ratingSort);
  }
  return [...items].sort(ratingSort);
}

function isPersianMovie(item: VodCard) {
  if (item.source === "mihandownload") return true;
  const countries = item.countries.map((country) => country.toLowerCase());
  return item.type === "movie" && (
    countries.includes("iran") ||
    countries.includes("ایران")
  );
}

function ratingSort(a: VodCard, b: VodCard) {
  return (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0);
}

function yearSort(a: VodCard, b: VodCard) {
  return (b.year ?? 0) - (a.year ?? 0) || ratingSort(a, b);
}

function hasGenre(item: VodCard, names: string[]) {
  const haystack = item.genres.map((genre) => genre.toLowerCase());
  return names.some((name) => haystack.includes(name));
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
    cache.promise = readFile(file, "utf8").then((data) => JSON.parse(data) as T);
  }
  return cache.promise;
}
