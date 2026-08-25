import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { MusicArtist, MusicIndex, MusicTrack } from "@/lib/music-types";

const DATA_FILE = path.join(process.cwd(), "public", "data", "music-index.json");
const CHECK_INTERVAL = 30_000;
const cache: { checkedAt?: number; mtimeMs?: number; value?: Promise<MusicIndex>; refreshing?: Promise<MusicIndex> } = {};

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
  const track = index.tracks.find((item) => item.id === id);
  return track ? normalizeMusicTrack(track) : null;
}

export function findMusicArtist(index: MusicIndex, slug: string): MusicArtist | null {
  const direct = index.artists.find((artist) => artist.slug === slug || artist.aliases?.includes(slug));
  if (direct) return direct;

  const normalizedSlug = musicSlug(slug);
  const matchingTracks = index.tracks.map(normalizeMusicTrack).filter((track) => track.artists.some((artist) => artist.slug === normalizedSlug || artist.aliases?.some((alias) => musicSlug(alias) === normalizedSlug)));
  const firstMatch = matchingTracks[0]?.artists.find((artist) => artist.slug === normalizedSlug || artist.aliases?.some((alias) => musicSlug(alias) === normalizedSlug));
  if (!firstMatch) return null;
  return {
    ...firstMatch,
    coverUrl: matchingTracks.find((track) => track.coverUrl)?.coverUrl ?? null,
    profileImageUrl: matchingTracks.find((track) => track.coverUrl)?.coverUrl ?? null,
    profileSourceUrl: firstMatch.sourceUrl,
    trackIds: matchingTracks.filter((track) => track.artists.some((artist) => artist.slug === normalizedSlug || artist.aliases?.some((alias) => musicSlug(alias) === normalizedSlug))).map((track) => track.id),
    categories: [...new Set(matchingTracks.map((track) => track.category).filter(Boolean))],
  };
}

export function musicForArtist(index: MusicIndex, slug: string) {
  const artist = findMusicArtist(index, slug);
  const identity = new Set([musicSlug(slug), artist?.slug, ...(artist?.aliases ?? [])].filter((value): value is string => Boolean(value)).map(musicSlug));
  const tracks = index.tracks
    .filter((rawTrack) => {
      const normalizedTrack = normalizeMusicTrack(rawTrack);
      return rawTrack.artists.some((item) => identity.has(musicSlug(item.slug)) || item.aliases?.some((alias) => identity.has(musicSlug(alias))))
        || normalizedTrack.artists.some((item) => identity.has(musicSlug(item.slug)) || item.aliases?.some((alias) => identity.has(musicSlug(alias))));
    })
    .map(normalizeMusicTrack);
  return diversifyMusicTracks(tracks);
}

export function searchMusic(index: MusicIndex, query: string, kind = "all", category = "all") {
  const needle = normalizeSearchValue(query);
  return index.tracks.map(normalizeMusicTrack).filter((track) => {
    const matchesKind = kind === "all" || track.kind === kind;
    const matchesCategory = category === "all" || !category || track.category === category;
    const matchesQuery = !needle || normalizeSearchValue([
      track.title,
      track.persianTitle,
      track.category,
      ...track.artists.map((artist) => artist.name),
      ...track.artists.flatMap((artist) => artist.aliases ?? []),
    ].join(" ")).includes(needle);
    return matchesKind && matchesCategory && matchesQuery;
  });
}

export function selectMusicShelfTracks(tracks: MusicTrack[], limit = 15) {
  const candidates = [...tracks]
    .map(normalizeMusicTrack)
    .filter((track) => track.sources.some((source) => source.kind === "stream" && source.available !== false))
    .sort((left, right) => (
      Number(Boolean(right.coverUrl)) - Number(Boolean(left.coverUrl))
      || (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    ));
  return diversifyMusicTracks(candidates, limit);
}

export function relatedMusic(index: MusicIndex, track: MusicTrack, limit = 12) {
  track = normalizeMusicTrack(track);
  const currentArtists = new Set(track.artists.flatMap((artist) => [artist.slug, ...(artist.aliases ?? [])]));
  const titleTerms = new Set(normalizeTrackText(track.title).split(" ").filter((term) => term.length > 3));

  return index.tracks
    .map(normalizeMusicTrack)
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

/**
 * World of Music sometimes publishes a multi-artist album under the single
 * artist "Various Artists" and puts the real performer before `---` in the
 * track title. Normalize that legacy shape at read time so old catalogs are
 * immediately useful without requiring a full re-scrape.
 */
export function normalizeMusicTrack(track: MusicTrack): MusicTrack {
  const isVarious = track.artists.length === 1 && musicSlug(track.artists[0]?.slug || track.artists[0]?.name) === "various-artists";
  const match = isVarious ? track.title.match(/^\s*(.+?)\s+---\s+(.+?)\s*$/u) : null;
  if (!match) return track;

  const names = match[1]
    .split(/\s*;\s*|\s+&\s+|\s+\band\b\s+/iu)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!names.length) return track;

  const artists = names.map((name) => ({
    name,
    slug: musicSlug(name),
    sourceUrl: track.sourceUrl,
    aliases: [],
  }));
  const title = match[2].trim();
  return {
    ...track,
    title,
    persianTitle: track.persianTitle === track.title ? title : track.persianTitle,
    artist: artists[0],
    artists,
  };
}

/**
 * Selects a shelf in round-robin order by artist and prefers a new cover or
 * album before reusing an image. This prevents one album/artist from filling
 * an entire landing rail while preserving every track for full pages.
 */
export function diversifyMusicTracks(tracks: MusicTrack[], limit = tracks.length) {
  const normalized = tracks.map(normalizeMusicTrack);
  const groups = new Map<string, MusicTrack[]>();
  const seenIds = new Set<string>();
  for (const track of normalized) {
    if (seenIds.has(track.id)) continue;
    seenIds.add(track.id);
    const key = track.artists.map((artist) => musicSlug(artist.slug || artist.name)).sort().join("|") || track.album?.id || track.id;
    const group = groups.get(key) ?? [];
    group.push(track);
    groups.set(key, group);
  }

  const buckets = [...groups.values()].sort((left, right) => artistGroupPriority(left) - artistGroupPriority(right));
  const selected: MusicTrack[] = [];
  const usedCovers = new Set<string>();
  const usedTrackIds = new Set<string>();
  const target = Math.max(0, Math.min(limit, normalized.length));

  while (selected.length < target) {
    let added = false;
    for (const bucket of buckets) {
      const candidate = bucket.find((track) => !usedTrackIds.has(track.id) && !usedCovers.has(artKey(track)));
      if (!candidate) continue;
      selected.push(candidate);
      usedTrackIds.add(candidate.id);
      usedCovers.add(artKey(candidate));
      added = true;
      if (selected.length >= target) break;
    }
    if (added) continue;

    // Once all distinct artwork is represented, continue round-robin so a
    // full artist page still contains every track instead of dropping items.
    for (const bucket of buckets) {
      const candidate = bucket.find((track) => !usedTrackIds.has(track.id));
      if (!candidate) continue;
      selected.push(candidate);
      usedTrackIds.add(candidate.id);
      if (selected.length >= target) break;
    }
    if (!added && selected.length >= normalized.length) break;
  }
  return selected;
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

function artKey(track: MusicTrack) {
  return track.coverUrl || track.album?.id || track.id;
}

function artistGroupPriority(bucket: MusicTrack[]) {
  const name = bucket[0]?.artists.map((artist) => artist.name).join(" ") ?? "";
  return /^(?:various artists|unknown(?: artist)?|هنرمند نامشخص|srv[a-z]*|\d+|full\b|best\s+of\b|remix\b|mix\b)/iu.test(name.trim()) ? 1 : 0;
}

function musicSlug(value: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064a\u0649]/g, "\u06cc")
    .replace(/\u0643/g, "\u06a9")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
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
