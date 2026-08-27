import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const INPUT_FILE = path.join(DATA_DIR, "music-index.json");
const LANDING_FILE = path.join(DATA_DIR, "music-landing.json");
const HOME_FILE = path.join(DATA_DIR, "music-home.json");
const CLASSICS = "موسیقی قدیمی فارسی";
const FOREIGN = "موسیقی خارجی";
const REMIX = "ریمیکس";

/**
 * Produces small, purpose-built payloads for the two music entry points.
 * The full catalog is intentionally kept out of the first render: it remains
 * available for search, artist, playlist, and detail routes only.
 */
export function buildMusicLandingIndexes(index) {
  const tracks = Array.isArray(index.tracks) ? index.tracks : [];
  const artists = Array.isArray(index.artists) ? index.artists : [];
  const stats = {
    tracks: tracks.filter((track) => track.kind === "track").length,
    artists: artists.length || new Set(tracks.flatMap((track) => (track.artists ?? []).map((artist) => artist.slug))).size,
    videos: tracks.filter((track) => track.kind === "video").length,
  };
  const primaryArtist = artists
    .filter((artist) => artist.trackIds?.length >= 8 && !isLowValueArtist(artist.name))
    .sort((left, right) => Number(Boolean(right.profileImageUrl || right.coverUrl)) - Number(Boolean(left.profileImageUrl || left.coverUrl)) || right.trackIds.length - left.trackIds.length)[0];

  const landingTracks = uniqueTracks([
    ...pickDiverse(tracks.filter((track) => track.kind === "track"), 64),
    ...pickDiverse(tracks.filter((track) => track.kind === "video"), 42),
    ...pickDiverse(tracks.filter((track) => track.category === REMIX), 52),
    ...pickDiverse(tracks.filter((track) => track.category === CLASSICS), 52),
    ...pickDiverse(tracks.filter((track) => track.category === FOREIGN), 42),
    ...pickDiverse(primaryArtist ? tracks.filter((track) => (track.artists ?? []).some((artist) => artist.slug === primaryArtist.slug)) : [], 24),
  ]).map(compactTrack);

  const selectedArtistSlugs = new Set(landingTracks.flatMap((track) => track.artists.map((artist) => artist.slug)));
  const featuredArtists = artists
    .filter((artist) => artist.trackIds?.length > 1 && !isLowValueArtist(artist.name))
    .sort((left, right) => Number(Boolean(right.profileImageUrl || right.coverUrl)) - Number(Boolean(left.profileImageUrl || left.coverUrl)) || right.trackIds.length - left.trackIds.length)
    .slice(0, 100);
  const landingArtists = uniqueArtists([
    ...artists.filter((artist) => selectedArtistSlugs.has(artist.slug)),
    ...featuredArtists,
  ]).map(compactArtist);

  const landing = makeIndex(index, landingTracks, landingArtists, stats, "landing");
  const homeTracks = uniqueTracks([
    ...pickDiverse(landingTracks.filter((track) => track.kind === "track"), 36),
    ...pickDiverse(landingTracks.filter((track) => track.kind === "video"), 12),
  ]).map(compactTrack);
  const home = makeIndex(index, homeTracks, [], stats, "home");

  return { landing, home };
}

function makeIndex(source, tracks, artists, archiveStats, scope) {
  return {
    version: source.version ?? 1,
    source: source.source ?? "multi-source",
    updatedAt: source.updatedAt ?? new Date().toISOString(),
    scanned: source.scanned ?? { musicPages: 0, videoPages: 0, full: false },
    tracks,
    artists,
    categories: source.categories ?? [],
    archiveStats,
    scope,
  };
}

function compactTrack(track) {
  const artists = (track.artists?.length ? track.artists : [track.artist]).filter(Boolean).map(compactArtistRef);
  const artist = artists[0] ?? compactArtistRef(track.artist ?? { name: "هنرمند", slug: "artist", sourceUrl: track.sourceUrl ?? "" });
  const stream = (track.sources ?? []).find((source) => source.kind === "stream" && source.available !== false) ?? (track.sources ?? [])[0];
  return {
    id: track.id,
    kind: track.kind,
    title: track.title,
    persianTitle: track.persianTitle || track.title,
    artist,
    artists,
    coverUrl: track.coverUrl ?? null,
    description: null,
    sourceUrl: track.sourceUrl ?? artist.sourceUrl,
    publishedAt: track.publishedAt ?? null,
    category: track.category ?? "آهنگ",
    moods: track.moods ?? [],
    album: track.album ? {
      id: track.album.id,
      title: track.album.title,
      sourceUrl: track.album.sourceUrl,
      coverUrl: track.album.coverUrl ?? null,
      publishedAt: track.album.publishedAt ?? null,
      genres: track.album.genres ?? [],
      moods: track.album.moods ?? [],
    } : undefined,
    folder: track.folder ?? { root: "Unknown", year: null, month: null, day: null },
    // A single source is enough for a landing card's playable-state check.
    // The detail route still reads the complete quality/source list.
    sources: stream ? [{
      url: stream.url,
      label: stream.label,
      quality: stream.quality ?? null,
      kind: stream.kind,
      provider: stream.provider,
      available: stream.available,
    }] : [],
  };
}

function compactArtist(artist) {
  return {
    ...compactArtistRef(artist),
    coverUrl: artist.coverUrl ?? null,
    profileImageUrl: artist.profileImageUrl ?? null,
    bio: artist.bio ?? null,
    profileSourceUrl: artist.profileSourceUrl ?? artist.sourceUrl ?? null,
    // Keep the original count without serializing thousands of IDs into the
    // landing response. Detail artist pages load their full record on demand.
    trackIds: [],
    trackCount: artist.trackIds?.length ?? artist.trackCount ?? 0,
    categories: artist.categories ?? [],
  };
}

function compactArtistRef(artist) {
  return {
    name: artist?.name || "هنرمند",
    slug: artist?.slug || "artist",
    sourceUrl: artist?.sourceUrl || "",
    aliases: artist?.aliases ?? [],
  };
}

function pickDiverse(items, limit) {
  const ordered = [...items]
    .filter((track) => (track.sources ?? []).some((source) => source.kind === "stream" && source.available !== false))
    .sort((left, right) => Number(Boolean(right.coverUrl)) - Number(Boolean(left.coverUrl)) || String(right.publishedAt ?? "").localeCompare(String(left.publishedAt ?? "")) || String(left.id).localeCompare(String(right.id)));
  const selected = [];
  const usedArtists = new Set();
  const usedCovers = new Set();
  for (const track of ordered) {
    const artistKey = (track.artists ?? [track.artist]).filter(Boolean).map((artist) => artist.slug || artist.name).sort().join("|");
    const coverKey = track.coverUrl || track.album?.id || track.id;
    if (usedArtists.has(artistKey) || usedCovers.has(coverKey)) continue;
    selected.push(track);
    usedArtists.add(artistKey);
    usedCovers.add(coverKey);
    if (selected.length >= limit) return selected;
  }
  for (const track of ordered) {
    if (selected.some((item) => item.id === track.id)) continue;
    selected.push(track);
    if (selected.length >= limit) break;
  }
  return selected;
}

function uniqueTracks(items) {
  const seen = new Set();
  return items.filter((item) => item?.id && !seen.has(item.id) && (seen.add(item.id), true));
}

function uniqueArtists(items) {
  const seen = new Set();
  return items.filter((item) => item?.slug && !seen.has(item.slug) && (seen.add(item.slug), true));
}

function isLowValueArtist(value = "") {
  return /^(?:various artists|unknown(?: artist)?|هنرمند نامشخص|srv[a-z]*|\d+|full\b|best\s+of\b|remix\b|mix\b)/iu.test(String(value).trim());
}

async function main() {
  const index = JSON.parse(await readFile(INPUT_FILE, "utf8"));
  const { landing, home } = buildMusicLandingIndexes(index);
  await Promise.all([
    writeFile(LANDING_FILE, JSON.stringify(landing)),
    writeFile(HOME_FILE, JSON.stringify(home)),
  ]);
  console.log(JSON.stringify({
    landing: { tracks: landing.tracks.length, artists: landing.artists.length, bytes: Buffer.byteLength(JSON.stringify(landing)) },
    home: { tracks: home.tracks.length, bytes: Buffer.byteLength(JSON.stringify(home)) },
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
