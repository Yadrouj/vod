import { BRAND_NAME } from "./brand";
import { findVodItem, normalizeVodType } from "./catalog";
import {
  buildSeasonSummaries,
  expandSeasonDownloads,
  movieDownloadSources,
  type DownloadSource,
  type EpisodeDownload,
  type EpisodeFile,
} from "./downloads";
import { subzoneSearchUrl } from "./subtitles";
import type { VodCard, VodItem } from "./types";
import { loadVodIndex } from "./vod-index";

export type BotSort = "relevance" | "rating" | "year" | "title";

export type BotSearchParams = {
  q: string;
  type: "all" | "movie" | "series";
  genre: string;
  country: string;
  language: string;
  year: string;
  yearFrom: number | null;
  yearTo: number | null;
  quality: string;
  minImdb: number;
  maxImdb: number;
  page: number;
  limit: number;
  sort: BotSort;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type SerializedDownload = ReturnType<typeof serializeDownload>;
type SerializedEpisode = ReturnType<typeof serializeEpisode>;

export function botOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function parseBotSearchParams(searchParams: URLSearchParams): BotSearchParams {
  const q = (searchParams.get("q") ?? searchParams.get("query") ?? searchParams.get("search") ?? "").trim();
  const year = cleanFilter(searchParams.get("year") ?? "");
  const yearRange = parseYearRange(year);
  const type = normalizeSearchType(searchParams.get("type") ?? searchParams.get("kind") ?? "all");

  return {
    q,
    type,
    genre: cleanFilter(searchParams.get("genre") ?? searchParams.get("genere") ?? ""),
    country: cleanFilter(searchParams.get("country") ?? searchParams.get("countries") ?? ""),
    language: cleanFilter(searchParams.get("language") ?? searchParams.get("subtitle") ?? ""),
    year,
    yearFrom: numberParam(searchParams, ["yearFrom", "fromYear", "minYear"]) ?? yearRange.from,
    yearTo: numberParam(searchParams, ["yearTo", "toYear", "maxYear"]) ?? yearRange.to,
    quality: cleanFilter(searchParams.get("quality") ?? ""),
    minImdb: clamp(numberParam(searchParams, ["minImdb", "minScore", "imdb", "score"]) ?? 0, 0, 10),
    maxImdb: clamp(numberParam(searchParams, ["maxImdb", "maxScore"]) ?? 10, 0, 10),
    page: Math.max(1, Math.floor(numberParam(searchParams, ["page"]) ?? 1)),
    limit: clamp(Math.floor(numberParam(searchParams, ["limit", "pageSize"]) ?? DEFAULT_LIMIT), 1, MAX_LIMIT),
    sort: normalizeSort(searchParams.get("sort") ?? ""),
  };
}

export async function searchBotCatalog(params: BotSearchParams, origin: string) {
  const index = await loadVodIndex();
  const scored = index.items
    .map((item) => ({ item, ...scoreBotItem(item, params.q) }))
    .filter(({ item, score }) => matchesBotFilters(item, params, score))
    .sort((a, b) => sortBotResults(a, b, params.sort, Boolean(params.q)));

  const total = scored.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.limit;

  return {
    service: BRAND_NAME,
    query: params.q,
    filters: {
      type: params.type,
      genre: params.genre || "all",
      country: params.country || "all",
      language: params.language || "all",
      year: params.year || "all",
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      quality: params.quality || "all",
      minImdb: params.minImdb,
      maxImdb: params.maxImdb,
      sort: params.sort,
    },
    pagination: {
      page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    items: scored.slice(start, start + params.limit).map(({ item, score, reasons }) =>
      serializeBotCard(item, origin, score, reasons)
    ),
  };
}

export async function getBotFilters(origin: string) {
  const index = await loadVodIndex();
  const typeCounts = countTypes(index.items);

  return {
    service: BRAND_NAME,
    sourceUrl: index.sourceUrl,
    generatedAt: index.generatedAt,
    totals: {
      titles: index.totalTitles,
      links: index.totalLinks,
      movies: typeCounts.movie,
      series: typeCounts.series,
    },
    menus: {
      main: [
        { label: "Movies", value: "movie", endpoint: `${origin}/api/bot/search?type=movie` },
        { label: "Series", value: "series", endpoint: `${origin}/api/bot/search?type=series` },
        { label: "Top IMDb", value: "top", endpoint: `${origin}/api/bot/search?minImdb=8&sort=rating` },
        { label: "Search", value: "search", endpoint: `${origin}/api/bot/search?q=break` },
      ],
      imdbScores: [9, 8.5, 8, 7.5, 7].map((score) => ({
        label: `IMDb ${score}+`,
        value: String(score),
        endpoint: `${origin}/api/bot/search?minImdb=${score}&sort=rating`,
      })),
    },
    filters: {
      types: [
        { value: "all", label: "All", count: index.items.length },
        { value: "movie", label: "Movies", count: typeCounts.movie },
        { value: "series", label: "Series", count: typeCounts.series },
      ],
      genres: countValues(index.items, (item) => item.genres),
      countries: countValues(index.items, (item) => item.countries),
      languages: countValues(index.items, (item) => item.languages),
      years: countValues(index.items, (item) => (item.year ? [String(item.year)] : [])),
      qualities: countValues(index.items, (item) => item.qualities),
    },
    examples: [
      `${origin}/api/bot/search?q=break`,
      `${origin}/api/bot/search?type=series&genre=Crime&minImdb=8`,
      `${origin}/api/bot/search?type=movie&yearFrom=2020&country=United%20States`,
      `${origin}/api/bot/title/tt0903747`,
      `${origin}/api/bot/title/tt0903747?season=1`,
    ],
  };
}

export async function getBotTitleDetail(id: string, options: { season?: number | null; includeDownloads?: boolean; maxFiles?: number }, origin: string) {
  const item = await findVodItem(id);
  if (!item) return null;

  const type = normalizeVodType(item.type);
  const seasons = buildSeasonSummaries(item.links);
  const includeDownloads = options.includeDownloads || Boolean(options.season);
  const maxFiles = clamp(Math.floor(options.maxFiles ?? 12), 1, 80);
  const firstFile = item.links[0] ? movieDownloadSources([item.links[0]])[0] : null;
  const bestFile = firstFile ? serializeDownload(firstFile) : null;

  const detail: {
    service: string;
    item: ReturnType<typeof serializeBotItem>;
    actions: ReturnType<typeof titleActions>;
    bestFile: SerializedDownload | null;
    seasons: ReturnType<typeof buildSeasonSummaries>;
    movieFiles: SerializedDownload[];
    selectedSeason: number | null;
    episodes: SerializedEpisode[] | null;
  } = {
    service: BRAND_NAME,
    item: serializeBotItem(item, origin),
    actions: titleActions(item, origin),
    bestFile,
    seasons,
    movieFiles: [],
    selectedSeason: null as number | null,
    episodes: null,
  };

  if (type === "movie") {
    detail.movieFiles = includeDownloads
      ? movieDownloadSources(item.links).slice(0, maxFiles).map(serializeDownload)
      : movieDownloadSources(item.links).slice(0, 5).map(serializeDownload);
    return detail;
  }

  if (!seasons.length) return detail;

  const selectedSeason = seasons.some((season) => season.season === options.season)
    ? (options.season as number)
    : seasons[0].season;
  detail.selectedSeason = selectedSeason;

  if (includeDownloads) {
    const expanded = await expandSeasonDownloads(item, selectedSeason);
    detail.episodes = expanded.episodes.map((episode) => serializeEpisode(episode, maxFiles));
  }

  return detail;
}

function serializeBotCard(item: VodCard, origin: string, score: number, reasons: string[]) {
  const type = normalizeVodType(item.type);
  const urls = itemUrls(item.imdbCode, origin);

  return {
    id: item.id,
    imdbCode: item.imdbCode,
    title: item.title,
    type,
    year: item.year,
    imdbRating: item.imdbRating,
    imdbVotes: item.imdbVotes,
    genres: item.genres,
    countries: item.countries,
    languages: item.languages,
    qualities: item.qualities,
    linksCount: item.linksCount,
    runtimeMinutes: item.runtimeMinutes,
    overview: compactText(item.overview, 220),
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    matchScore: score,
    matchReasons: reasons,
    urls,
    telegram: {
      text: titleLine(item.title, type, item.year, item.imdbRating, item.genres),
      buttons: [
        { text: "Details", callback_data: `title:${item.imdbCode}` },
        { text: "Open page", url: urls.detail },
        { text: "Play", url: urls.watch },
      ],
    },
  };
}

function serializeBotItem(item: VodItem, origin: string) {
  const type = normalizeVodType(item.type);
  return {
    id: item.id,
    imdbCode: item.imdbCode,
    imdbUrl: item.imdbUrl,
    title: item.title,
    originalTitle: item.originalTitle,
    type,
    year: item.year,
    endYear: item.endYear,
    runtimeMinutes: item.runtimeMinutes,
    imdbRating: item.imdbRating,
    imdbVotes: item.imdbVotes,
    metascore: item.metascore,
    certificate: item.certificate,
    genres: item.genres ?? [],
    countries: item.countries ?? [],
    languages: item.languages ?? [],
    qualities: item.qualities,
    groups: item.groups,
    overview: item.overview,
    tagline: item.tagline,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    urls: itemUrls(item.imdbCode, origin),
    telegram: {
      text: titleLine(item.title, type, item.year, item.imdbRating, item.genres ?? [], item.overview),
    },
  };
}

function titleActions(item: VodItem, origin: string) {
  const urls = itemUrls(item.imdbCode, origin);
  return {
    buttons: [
      { text: "Play online", url: urls.watch },
      { text: "Open page", url: urls.detail },
      item.imdbUrl
        ? { text: "IMDb", url: item.imdbUrl }
        : item.sourcePageUrl
          ? { text: "Source", url: item.sourcePageUrl }
          : null,
      { text: "Subtitles", url: subzoneSearchUrl(item.title, item.year) },
    ].filter(Boolean),
    seasonButtons: buildSeasonSummaries(item.links).slice(0, 20).map((season) => ({
      text: season.label,
      callback_data: `season:${item.imdbCode}:${season.season}`,
      endpoint: `${origin}/api/bot/title/${item.imdbCode}?season=${season.season}`,
    })),
  };
}

function serializeEpisode(episode: EpisodeDownload, maxFiles: number) {
  return {
    season: episode.season,
    episode: episode.episode,
    code: episode.code,
    title: episode.title,
    summary: compactText(episode.summary, 260),
    imageUrl: episode.imageUrl,
    files: episode.files.slice(0, maxFiles).map(serializeDownload),
    telegram: {
      text: `${episode.code} - ${episode.title}`,
      buttons: episode.files.slice(0, Math.min(maxFiles, 10)).map((file) => ({
        text: [file.quality, file.size].filter(Boolean).join(" / ") || file.name,
        url: file.url,
      })),
    },
  };
}

function serializeDownload(file: DownloadSource | EpisodeFile) {
  return {
    label: "label" in file ? file.label : file.name,
    name: "name" in file ? file.name : file.fileName ?? file.label,
    url: file.url,
    quality: file.quality,
    group: file.group,
    release: file.release,
    size: file.size,
    season: "season" in file ? file.season ?? null : null,
    episode: "episode" in file ? file.episode ?? null : null,
    modified: "modified" in file ? file.modified ?? null : null,
  };
}

function scoreBotItem(item: VodCard, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return {
      score: Math.round((item.imdbRating ?? 0) * 10 + Math.min(20, Math.log10((item.imdbVotes ?? 0) + 1) * 3)),
      reasons: item.genres.slice(0, 2),
    };
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  const title = item.title.toLowerCase();
  const imdb = item.imdbCode.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (title === query) {
    score += 240;
    reasons.push("Exact title");
  } else if (title.startsWith(query)) {
    score += 150;
    reasons.push("Title starts with query");
  } else if (title.includes(query)) {
    score += 120;
    reasons.push("Title contains query");
  }

  if (imdb === query) {
    score += 260;
    reasons.push("IMDb ID");
  } else if (imdb.includes(query)) {
    score += 130;
    reasons.push("IMDb ID match");
  }

  for (const token of tokens) {
    if (title.includes(token)) score += 38;
  }

  if (score <= 0) return { score: 0, reasons: [] };

  score += Math.round((item.imdbRating ?? 0) * 4);
  score += Math.min(16, Math.log10((item.imdbVotes ?? 0) + 1) * 2);
  if (!reasons.length && score > 0) reasons.push("Metadata match");

  return { score: Math.round(score), reasons: reasons.slice(0, 3) };
}

function matchesBotFilters(item: VodCard, params: BotSearchParams, score: number) {
  if (params.q && score <= 0) return false;
  if (params.type !== "all" && normalizeVodType(item.type) !== params.type) return false;
  if (params.genre && !hasValue(item.genres, params.genre)) return false;
  if (params.country && !hasValue(item.countries, params.country)) return false;
  if (params.language && !hasValue(item.languages, params.language)) return false;
  if (params.quality && !hasValue(item.qualities, params.quality)) return false;
  if (params.year && !params.year.includes("-") && String(item.year ?? "") !== params.year) return false;
  if (params.yearFrom && (item.year ?? 0) < params.yearFrom) return false;
  if (params.yearTo && (item.year ?? 9999) > params.yearTo) return false;
  if ((item.imdbRating ?? 0) < params.minImdb) return false;
  if ((item.imdbRating ?? 0) > params.maxImdb) return false;
  return true;
}

function sortBotResults(
  a: { item: VodCard; score: number },
  b: { item: VodCard; score: number },
  sort: BotSort,
  hasQuery: boolean
) {
  if (sort === "title") return a.item.title.localeCompare(b.item.title);
  if (sort === "year") return (b.item.year ?? 0) - (a.item.year ?? 0) || ratingSort(a.item, b.item);
  if (sort === "rating") return ratingSort(a.item, b.item);
  if (hasQuery) return b.score - a.score || ratingSort(a.item, b.item);
  return ratingSort(a.item, b.item);
}

function ratingSort(a: VodCard, b: VodCard) {
  return (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0);
}

function countTypes(items: VodCard[]) {
  return items.reduce(
    (counts, item) => {
      counts[normalizeVodType(item.type)] += 1;
      return counts;
    },
    { movie: 0, series: 0 }
  );
}

function countValues(items: VodCard[], getter: (item: VodCard) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const rawValue of getter(item)) {
      const value = rawValue.trim();
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function itemUrls(imdbCode: string, origin: string) {
  return {
    detail: `${origin}/${imdbCode}`,
    watch: `${origin}/watch/${imdbCode}`,
    apiDetail: `${origin}/api/bot/title/${imdbCode}`,
  };
}

function titleLine(title: string, type: string, year: number | null, rating: number | null, genres: string[], overview?: string | null) {
  const meta = [type, year, rating ? `IMDb ${rating.toFixed(1)}` : null].filter(Boolean).join(" / ");
  const genreLine = genres.slice(0, 3).join(" / ");
  return [title, meta, genreLine, compactText(overview, 180)].filter(Boolean).join("\n");
}

function normalizeSearchType(value: string): "all" | "movie" | "series" {
  const lower = value.toLowerCase();
  if (/(movie|movies|film|films)/.test(lower)) return "movie";
  if (/(series|serial|show|tv)/.test(lower)) return "series";
  return "all";
}

function normalizeSort(value: string): BotSort {
  if (value === "rating" || value === "year" || value === "title") return value;
  return "relevance";
}

function cleanFilter(value: string) {
  const trimmed = value.trim();
  return trimmed && !/^all$/i.test(trimmed) ? trimmed : "";
}

function hasValue(values: string[], target: string) {
  const normalized = target.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalized);
}

function parseYearRange(value: string) {
  const match = value.match(/^(19\d{2}|20\d{2})\s*[-:]\s*(19\d{2}|20\d{2})$/);
  if (!match) return { from: null, to: null };
  return { from: Number(match[1]), to: Number(match[2]) };
}

function numberParam(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const raw = searchParams.get(key);
    if (raw === null || raw.trim() === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function compactText(value: string | null | undefined, max = 180) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}...` : clean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
