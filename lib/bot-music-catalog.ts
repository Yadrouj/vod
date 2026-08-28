import { findMusicTrack, loadMusicIndex, normalizeMusicTrack, searchMusic } from "@/lib/music";
import type { MusicTrack } from "@/lib/music-types";

export type BotMusicKind = "all" | "track" | "video";

export type BotMusicSearchParams = {
  id: string;
  q: string;
  kind: BotMusicKind;
  category: string;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export function parseBotMusicSearchParams(searchParams: URLSearchParams): BotMusicSearchParams {
  return {
    id: (searchParams.get("id") ?? "").trim(),
    q: (searchParams.get("q") ?? searchParams.get("query") ?? "").trim(),
    kind: normalizeKind(searchParams.get("kind") ?? "all"),
    category: cleanCategory(searchParams.get("category") ?? ""),
    page: positiveInt(searchParams.get("page"), 1),
    limit: Math.min(MAX_LIMIT, Math.max(1, positiveInt(searchParams.get("limit"), DEFAULT_LIMIT))),
  };
}

export async function getBotMusicFilters(origin: string) {
  const index = await loadMusicIndex();
  const categoryCounts = countCategories(index.tracks);
  const typeCounts = index.tracks.reduce(
    (counts, track) => {
      if (track.kind === "video") counts.video += 1;
      else counts.track += 1;
      return counts;
    },
    { track: 0, video: 0 }
  );

  return {
    service: "SarvNema",
    totals: {
      tracks: index.tracks.length,
      artists: index.artists.length,
      musicVideos: typeCounts.video,
    },
    filters: {
      kinds: [
        { value: "all", label: "همه", count: index.tracks.length },
        { value: "track", label: "موزیک", count: typeCounts.track },
        { value: "video", label: "موزیک ویدئو", count: typeCounts.video },
      ],
      categories: categoryCounts,
    },
    examples: [
      `${origin}/api/bot/music?q=ابی`,
      `${origin}/api/bot/music?kind=video&limit=10`,
      `${origin}/api/bot/music?category=${encodeURIComponent("موسیقی قدیمی فارسی")}`,
    ],
  };
}

export async function searchBotMusic(params: BotMusicSearchParams, origin: string) {
  const index = await loadMusicIndex();
  const ranked = searchMusic(index, params.q, params.kind, params.category || "all")
    .map((track) => ({ track: normalizeMusicTrack(track), score: scoreMusic(track, params.q) }))
    .sort((left, right) => right.score - left.score || (right.track.publishedAt ?? "").localeCompare(left.track.publishedAt ?? "") || left.track.title.localeCompare(right.track.title));

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.limit;

  return {
    service: "SarvNema",
    query: params.q,
    filters: { kind: params.kind, category: params.category || "all" },
    pagination: {
      page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    items: ranked.slice(start, start + params.limit).map(({ track, score }) => serializeTrack(track, origin, score)),
  };
}

export async function getBotMusicDetail(id: string, origin: string) {
  const index = await loadMusicIndex();
  const rawTrack = findMusicTrack(index, id);
  if (!rawTrack) return null;
  const track = normalizeMusicTrack(rawTrack);
  const urls = trackUrls(track, origin);
  const sourceMap = new Map<string, MusicTrack["sources"][number]>();
  for (const source of track.sources) {
    if (source.url && !sourceMap.has(source.url)) sourceMap.set(source.url, source);
  }

  return {
    service: "SarvNema",
    item: {
      ...serializeTrack(track, origin, 0),
      description: compact(track.description, 600),
      sourceUrl: track.sourceUrl,
      album: track.album,
      moods: track.moods ?? [],
      sources: Array.from(sourceMap.values()).map((source) => ({
        url: source.url,
        label: source.label,
        quality: source.quality ?? null,
        kind: source.kind,
        provider: source.provider ?? null,
        available: source.available !== false,
      })),
      urls,
    },
  };
}

function serializeTrack(track: MusicTrack, origin: string, score: number) {
  const normalized = normalizeMusicTrack(track);
  return {
    id: normalized.id,
    title: normalized.persianTitle || normalized.title,
    originalTitle: normalized.title,
    kind: normalized.kind,
    category: normalized.category,
    artists: normalized.artists.map((artist) => artist.name),
    coverUrl: normalized.coverUrl,
    publishedAt: normalized.publishedAt,
    sourcesCount: normalized.sources.length,
    playableSources: normalized.sources.filter((source) => source.available !== false).length,
    matchScore: score,
    urls: trackUrls(normalized, origin),
  };
}

function trackUrls(track: MusicTrack, origin: string) {
  return {
    detail: `${origin}/music/${encodeURIComponent(track.id)}`,
    source: track.sourceUrl,
  };
}

function countCategories(tracks: MusicTrack[]) {
  const counts = new Map<string, number>();
  for (const track of tracks) {
    const category = track.category?.trim();
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const featured = ["آهنگ", "ریمیکس", "موزیک ویدیو", "موسیقی قدیمی فارسی", "موسیقی خارجی", "Soundtrack", "Classical", "Lo-Fi", "Jazz"];
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((left, right) => {
      const leftFeatured = featured.indexOf(left.value);
      const rightFeatured = featured.indexOf(right.value);
      if (leftFeatured >= 0 || rightFeatured >= 0) return (leftFeatured < 0 ? Number.MAX_SAFE_INTEGER : leftFeatured) - (rightFeatured < 0 ? Number.MAX_SAFE_INTEGER : rightFeatured);
      return right.count - left.count || left.label.localeCompare(right.label, "fa");
    });
}

function scoreMusic(track: MusicTrack, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return Number(Boolean(track.coverUrl)) * 5;
  const title = normalize(`${track.title} ${track.persianTitle}`);
  const artists = normalize(track.artists.map((artist) => `${artist.name} ${(artist.aliases ?? []).join(" ")}`).join(" "));
  if (title === normalizedQuery) return 300;
  if (artists === normalizedQuery) return 240;
  if (title.startsWith(normalizedQuery)) return 200;
  if (artists.startsWith(normalizedQuery)) return 180;
  if (title.includes(normalizedQuery)) return 150;
  if (artists.includes(normalizedQuery)) return 130;
  return normalizedQuery.split(" ").filter((part) => title.includes(part) || artists.includes(part)).length * 24;
}

function normalizeKind(value: string): BotMusicKind {
  const normalized = value.trim().toLowerCase();
  return normalized === "video" || normalized === "track" ? normalized : "all";
}

function cleanCategory(value: string) {
  const category = value.trim();
  return !category || /^all$/i.test(category) ? "" : category;
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[\u064a\u0649]/g, "\u06cc")
    .replace(/\u0643/g, "\u06a9")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function compact(value: string | null | undefined, max: number) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}
