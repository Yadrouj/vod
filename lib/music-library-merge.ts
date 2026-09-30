import type { MusicArtist, MusicArtistIndex, MusicIndex, MusicLandingIndex, MusicTrack } from "./music-types";

const key = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "")
  .replace(/[\u064a\u0649]/gu, "ی").replace(/\u0643/gu, "ک").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/gu, "");
const exactIdentity = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase();
const identityKeys = (value: string) => [...new Set([key(value), exactIdentity(value)].filter(Boolean))];
const identities = (artist: MusicArtist) => [artist.slug, artist.name, ...(artist.aliases ?? [])].flatMap(identityKeys);

/** Exact names/aliases only: never merge different singers using fuzzy search. */
export function mergeMelodifyCatalog<T extends MusicIndex>(base: T, library: MusicIndex): T {
  if (!library.tracks.length) return base;
  const artists = new Map(base.artists.map(a => [a.slug, { ...a, trackIds: [...a.trackIds], categories: [...a.categories] }]));
  const aliases = new Map<string, string | null>();
  for (const artist of artists.values()) {
    for (const alias of identities(artist)) aliases.set(alias, aliases.has(alias) && aliases.get(alias) !== artist.slug ? null : artist.slug);
  }
  const importedArtists = new Map(library.artists.map(a => [a.slug, a]));
  const representedArtists = new Set([...base.artists.map(a => a.slug), ...(library.libraryExistingArtistSlugs ?? [])]);
  const knownIds = new Set(base.tracks.map(t => t.id));
  const additions: MusicTrack[] = [];
  const indexedBase = base as T & Partial<Pick<MusicArtistIndex, "artistTrackIds">> & {
    scope?: "home" | "landing" | "artist"; archiveStats?: MusicLandingIndex["archiveStats"];
  };
  const artistTrackIds = indexedBase.artistTrackIds
    ? Object.fromEntries(Object.entries(indexedBase.artistTrackIds).map(([slug, ids]) => [slug, new Set(ids)])) : null;
  // Every track updates the artist directory; compact landings only carry a
  // bounded selection of songs, not the entire 5k-track library.
  for (const track of library.tracks) {
    const refs = track.artists.map(ref => {
      const candidates = [ref.slug, ref.name, ...(ref.aliases ?? [])].flatMap(identityKeys);
      // New exports resolve names against the FULL artist directory. Resolving
      // them again against a small landing selection can collapse namesakes.
      const slug = library.libraryExistingArtistSlugs || artists.has(ref.slug)
        ? ref.slug : candidates.map(alias => aliases.get(alias)).find(Boolean) || ref.slug;
      const existing = artists.get(slug);
      const source = importedArtists.get(ref.slug);
      const artist: MusicArtist = existing ?? {
        ...ref, slug, coverUrl: source?.coverUrl || track.coverUrl,
        profileImageUrl: source?.profileImageUrl || track.coverUrl,
        trackIds: [], trackCount: 0, categories: [], aliases: [],
      };
      if (!artist.trackIds.includes(track.id)) {
        // Compact indexes serialize a count instead of their existing IDs.
        artist.trackCount = (artist.trackCount ?? artist.trackIds.length) + (knownIds.has(track.id) ? 0 : 1);
        artist.trackIds.push(track.id);
      }
      artist.categories = [...new Set([...artist.categories, track.category, ...(track.moods ?? [])])];
      artist.aliases = [...new Set([...(artist.aliases ?? []), ref.slug, ref.name, ...(ref.aliases ?? [])])].filter(a => a !== slug);
      artists.set(slug, artist);
      for (const alias of identities(artist)) {
        if (!aliases.has(alias)) aliases.set(alias, slug);
        if (artistTrackIds) (artistTrackIds[alias] ??= new Set()).add(track.id);
      }
      return { slug, name: artist.name, sourceUrl: artist.sourceUrl, aliases: artist.aliases };
    });
    if (!knownIds.has(track.id)) additions.push({ ...track, artist: refs[0], artists: refs });
  }
  const scope = indexedBase.scope;
  const selected = scope === "landing" || scope === "home" ? selectLibraryArrivals(additions, scope === "home" ? 24 : 48) : additions;
  const stats = indexedBase.archiveStats;
  const libraryCategoryCounts = library.categoryCounts ?? countCategories(library.tracks);
  const categoryCounts = mergeCategoryCounts(base, libraryCategoryCounts);
  return {
    ...base,
    updatedAt: library.updatedAt > base.updatedAt ? library.updatedAt : base.updatedAt,
    tracks: [...base.tracks, ...selected],
    artists: [...artists.values()],
    categoryCounts,
    libraryCategoryCounts,
    categories: [...new Set([...base.categories, ...library.categories, ...library.tracks.flatMap(t => [t.category, ...(t.moods ?? [])])])],
    ...(stats ? { archiveStats: { ...stats,
      tracks: stats.tracks + additions.filter(t => t.kind === "track").length,
      artists: stats.artists + [...artists.keys()].filter(slug => !representedArtists.has(slug)).length,
    } } : {}),
    ...(artistTrackIds ? { artistTrackIds: Object.fromEntries(Object.entries(artistTrackIds).map(([slug, ids]) => [slug, [...ids]])) } : {}),
  } as T;
}

function mergeCategoryCounts(base: MusicIndex, libraryCategoryCounts: Record<string, number>) {
  const result = new Map<string, number>();
  const add = (counts: Record<string, number> | undefined) => {
    for (const [category, count] of Object.entries(counts ?? {})) {
      if (Number.isFinite(count) && count > 0) result.set(category, (result.get(category) ?? 0) + count);
    }
  };
  const subtract = (counts: Record<string, number> | undefined) => {
    for (const [category, count] of Object.entries(counts ?? {})) {
      const remaining = (result.get(category) ?? 0) - count;
      if (remaining > 0) result.set(category, remaining);
      else result.delete(category);
    }
  };
  if (base.categoryCounts) {
    add(base.categoryCounts);
    // A second merge starts from an already merged compact/full index. Remove
    // the previous import before adding the latest server snapshot.
    subtract(base.libraryCategoryCounts);
  } else {
    for (const track of base.tracks) {
      for (const category of new Set([track.category, ...(track.moods ?? [])].filter(Boolean))) {
        result.set(category, (result.get(category) ?? 0) + 1);
      }
    }
  };
  add(libraryCategoryCounts);
  return Object.fromEntries([...result.entries()].sort(([left], [right]) => left.localeCompare(right, "fa")));
}

function countCategories(tracks: MusicTrack[]) {
  const counts: Record<string, number> = {};
  for (const track of tracks) {
    for (const category of new Set([track.category, ...(track.moods ?? [])].filter(Boolean))) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
  return counts;
}

export function selectLibraryArrivals(tracks: MusicTrack[], limit: number) {
  const sorted = tracks.filter(t => t.sources.some(s => s.provider === "melodify" && s.available !== false))
    .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || a.id.localeCompare(b.id, "en", { numeric: true }));
  const selected: MusicTrack[] = [];
  const used = new Set<string>();
  for (const track of sorted) {
    if (used.has(track.artist.slug)) continue;
    used.add(track.artist.slug);
    selected.push(track);
    if (selected.length >= limit) return selected;
  }
  const ids = new Set(selected.map(t => t.id));
  return [...selected, ...sorted.filter(t => !ids.has(t.id))].slice(0, limit);
}
