import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { MusicArtist, MusicIndex, MusicTrack } from "@/lib/music-types";

const DATA_FILE = path.join(process.cwd(), "public", "data", "music-index.json");
const CHECK_INTERVAL = 30_000;
let cache: { checkedAt?: number; mtimeMs?: number; value?: Promise<MusicIndex>; refreshing?: Promise<MusicIndex> } = {};

const emptyIndex: MusicIndex = {
  version: 1,
  source: "multi-source",
  updatedAt: "",
  scanned: { musicPages: 0, videoPages: 0, full: false },
  tracks: [],
  artists: [],
  categories: [],
};

export async function loadMusicIndex(): Promise<MusicIndex> {
  const now = Date.now();
  if (cache.value && cache.checkedAt && now - cache.checkedAt < CHECK_INTERVAL) return cache.value;
  // At cold start several App Router requests can arrive together. Sharing the
  // one file read + JSON parse avoids multiplying a large catalog parse and
  // makes the first music navigation predictable.
  if (cache.refreshing) return cache.value ?? cache.refreshing;
  cache.refreshing = (async () => {
    try {
      const info = await stat(DATA_FILE);
      if (!cache.value || cache.mtimeMs !== info.mtimeMs) {
        cache.mtimeMs = info.mtimeMs;
        cache.value = readFile(DATA_FILE, "utf8").then((data) => JSON.parse(data) as MusicIndex);
      }
      return await cache.value;
    } catch {
      return emptyIndex;
    } finally {
      cache.checkedAt = Date.now();
      cache.refreshing = undefined;
    }
  })();
  return cache.refreshing;
}

export function findMusicTrack(index: MusicIndex, id: string): MusicTrack | null {
  return index.tracks.find((track) => track.id === id) ?? null;
}

export function findMusicArtist(index: MusicIndex, slug: string): MusicArtist | null {
  return index.artists.find((artist) => artist.slug === slug || artist.aliases?.includes(slug)) ?? null;
}

export function musicForArtist(index: MusicIndex, slug: string) {
  const artist = findMusicArtist(index, slug);
  const identity = new Set([slug, artist?.slug, ...(artist?.aliases ?? [])].filter(Boolean));
  return index.tracks.filter((track) => track.artists.some((item) => identity.has(item.slug) || item.aliases?.some((alias) => identity.has(alias))));
}

export function searchMusic(index: MusicIndex, query: string, kind = "all") {
  const needle = normalizeSearchValue(query);
  return index.tracks.filter((track) => {
    const matchesKind = kind === "all" || track.kind === kind;
    const matchesQuery = !needle || normalizeSearchValue([
      track.title,
      track.persianTitle,
      track.category,
      ...track.artists.map((artist) => artist.name),
      ...track.artists.flatMap((artist) => artist.aliases ?? []),
    ].join(" ")).includes(needle);
    return matchesKind && matchesQuery;
  });
}

export function relatedMusic(index: MusicIndex, track: MusicTrack, limit = 12) {
  const currentArtists = new Set(track.artists.flatMap((artist) => [artist.slug, ...(artist.aliases ?? [])]));
  const titleTerms = new Set(normalizeTrackText(track.title).split(" ").filter((term) => term.length > 3));

  return index.tracks
    .filter((candidate) => candidate.id !== track.id && candidate.kind === track.kind)
    .map((candidate) => {
      const candidateArtists = candidate.artists.flatMap((artist) => [artist.slug, ...(artist.aliases ?? [])]);
      const sharesArtist = candidateArtists.some((artist) => currentArtists.has(artist));
      const sharedTerms = normalizeTrackText(candidate.title).split(" ").filter((term) => titleTerms.has(term)).length;
      const score = (sharesArtist ? 1000 : 0)
        + (candidate.category === track.category ? 180 : 0)
        + sharedTerms * 24
        + (candidate.coverUrl ? 8 : 0)
        + (candidate.sources.some((source) => source.kind === "stream") ? 4 : 0);
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || (right.candidate.publishedAt ?? "").localeCompare(left.candidate.publishedAt ?? ""))
    .slice(0, limit)
    .map((item) => item.candidate);
}

export function relatedMusicArtists(index: MusicIndex, artist: MusicArtist, limit = 12) {
  const ownTracks = musicForArtist(index, artist.slug);
  const categories = new Set(ownTracks.map((track) => track.category));
  const ownIdentity = new Set([artist.slug, ...(artist.aliases ?? [])]);
  return index.artists
    .filter((candidate) => ![candidate.slug, ...(candidate.aliases ?? [])].some((slug) => ownIdentity.has(slug)))
    .map((candidate) => {
      const sharedCategories = candidate.categories.filter((category) => categories.has(category)).length;
      return { candidate, score: sharedCategories * 100 + Math.min(candidate.trackIds.length, 80) };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.candidate.trackIds.length - left.candidate.trackIds.length)
    .slice(0, limit)
    .map((item) => item.candidate);
}

function normalizeTrackText(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function normalizeSearchValue(value: string) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[\u064a\u0649]/g, "\u06cc")
    .replace(/\u0643/g, "\u06a9")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
