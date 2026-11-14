import type { MusicArtist, MusicArtistIndex, MusicIndex, MusicLandingIndex, MusicSource, MusicTrack } from "./music-types";

/** IDs and artist refs must be resolved by the producer against the FULL archive. */
export type MusicReleaseBundle = {
  observedAt: string;
  tracks: MusicTrack[];
  newTrackIds: string[];
  artists?: MusicArtist[];
};

type OverlayIndex = MusicIndex & Partial<Pick<MusicArtistIndex, "artistTrackIds">> & {
  scope?: "home" | "landing" | "artist";
  archiveStats?: MusicLandingIndex["archiveStats"];
};
type Release = { before?: MusicTrack; track: MusicTrack; isNew: boolean };
const cache = new WeakMap<MusicIndex, WeakMap<MusicReleaseBundle, MusicIndex>>();
const checkedTime = (value?: string | null) => value ? Date.parse(value) : NaN;
const tags = (track: MusicTrack) => new Set([track.category, ...(track.moods ?? [])].filter(Boolean));
const ids = (track: MusicTrack) => [track.id, ...(track.idAliases ?? [])];
const verified = (source: MusicSource) => source.available === true && Number.isFinite(checkedTime(source.checkedAt));
const mediaKey = (track: MusicTrack, url: string) => `${track.kind}\0${url}`;

/**
 * Pure, bounded overlay: no reads, fetches, title matching or archive rewriting.
 * The caller validates the bundle's shape/size (at most 180 releases). Object
 * identity caches assume immutable snapshots, like the catalog loaders do.
 */
export function applyMusicReleaseBundle<T extends MusicIndex>(base: T, bundle: MusicReleaseBundle): T {
  const hit = cache.get(base)?.get(bundle);
  if (hit) return hit as T;
  const remember = (result: T) => {
    for (const snapshot of [base, result]) {
      let entries = cache.get(snapshot);
      if (!entries) cache.set(snapshot, entries = new WeakMap());
      entries.set(bundle, result);
    }
    return result;
  };
  if (!bundle.tracks.length) return remember(base);

  const index: OverlayIndex = base;
  const compact = Boolean(index.scope);
  const archiveOlder = !(checkedTime(base.updatedAt) >= checkedTime(bundle.observedAt));
  const newIds = new Set(bundle.newTrackIds);
  const tracks = [...base.tracks];
  const primary = new Map<string, number>();
  const aliases = new Map<string, number | null>();
  const media = new Map<string, number | null>();
  const incomingMedia = new Set(bundle.tracks.flatMap(track => track.sources.map(source => mediaKey(track, source.url))));
  const categoryCounts = new Map(Object.entries(base.categoryCounts ?? {}));
  const registerUnique = (map: Map<string, number | null>, key: string, position: number) => {
    if (!map.has(key)) map.set(key, position);
    else if (map.get(key) !== position) map.set(key, null);
  };
  const register = (track: MusicTrack, position: number) => {
    primary.set(track.id, position);
    for (const alias of track.idAliases ?? []) registerUnique(aliases, alias, position);
    for (const source of track.sources) {
      const key = mediaKey(track, source.url);
      if (incomingMedia.has(key)) registerUnique(media, key, position);
    }
  };
  // A single archive pass on a cache miss, never one scan per release.
  for (const [position, track] of tracks.entries()) {
    register(track, position);
    if (!base.categoryCounts) for (const tag of tags(track)) categoryCounts.set(tag, (categoryCounts.get(tag) ?? 0) + 1);
  }
  const resolve = (track: MusicTrack) => {
    for (const id of ids(track)) {
      const position = primary.get(id);
      if (position !== undefined) return position;
    }
    for (const id of ids(track)) {
      const position = aliases.get(id);
      if (position != null) return position;
    }
    const candidates = new Set<number>();
    for (const source of track.sources) {
      const position = media.get(mediaKey(track, source.url));
      if (position != null) candidates.add(position);
    }
    return candidates.size === 1 ? candidates.values().next().value : undefined;
  };

  const releases = new Map<number, Release>();
  for (const incoming of bundle.tracks) {
    let position = resolve(incoming);
    const existing = position === undefined ? undefined : tracks[position];
    const track = existing ? mergeTrack(existing, incoming) : { ...incoming, sources: mergeSources([], incoming.sources) };
    if (!existing && !track.sources.some(verified)) continue;
    if (position === undefined) position = tracks.length;
    const previous = releases.get(position);
    releases.set(position, {
      before: previous ? previous.before : existing,
      track,
      isNew: Boolean(previous?.isNew || ids(incoming).some(id => newIds.has(id))),
    });
    tracks[position] = track;
    register(track, position);
  }
  // Later entries may revoke the only playable check on a pending addition.
  for (const [position, release] of releases) {
    if (!release.before && !release.track.sources.some(verified)) releases.delete(position);
  }
  if (!releases.size) return remember(base);

  const artists = new Map(base.artists.map(artist => [artist.slug, artist]));
  const baseArtistSlugs = new Set(artists.keys());
  const profiles = new Map((bundle.artists ?? []).map(artist => [artist.slug, artist]));
  const edits = new Map<string, { artist: MusicArtist; trackIds: Set<string>; categories: Set<string>; aliases: Set<string>; count: number; knownProfile: boolean }>();
  const artistTrackIds = index.artistTrackIds ? { ...index.artistTrackIds } : undefined;
  const categories = new Set(base.categories);
  let addedTracks = 0;
  let addedVideos = 0;
  const newArtistTracks = new Map<string, { ids: Set<string>; count: number }>();

  for (const { before, track, isNew } of releases.values()) {
    const increment = !before && (!compact || (archiveOlder && isNew));
    if (increment && track.kind === "track") addedTracks++;
    if (increment && track.kind === "video") addedVideos++;
    const previousTags = before ? tags(before) : new Set<string>();
    for (const tag of tags(track)) {
      categories.add(tag);
      if (increment || (before && (!compact || archiveOlder) && !previousTags.has(tag))) {
        categoryCounts.set(tag, (categoryCounts.get(tag) ?? 0) + 1);
      }
    }
    const refs = new Map([track.artist, ...track.artists].map(ref => [ref.slug, ref]));
    for (const ref of refs.values()) {
      let edit = edits.get(ref.slug);
      if (!edit) {
        const original = artists.get(ref.slug) ?? profiles.get(ref.slug);
        const artist = original ?? { ...ref, coverUrl: track.coverUrl, trackIds: [], categories: [] };
        edit = { artist, trackIds: new Set(artist.trackIds), categories: new Set(artist.categories),
          aliases: new Set(artist.aliases ?? []), count: artist.trackCount ?? artist.trackIds.length, knownProfile: Boolean(original) };
        edits.set(ref.slug, edit);
      }
      const represented = ids(track).some(id => edit.trackIds.has(id));
      if (!represented && (increment || !edit.knownProfile)) edit.count++;
      edit.trackIds.add(track.id);
      for (const tag of tags(track)) edit.categories.add(tag);
      for (const alias of ref.aliases ?? []) edit.aliases.add(alias);
      if (increment) {
        let fresh = newArtistTracks.get(ref.slug);
        if (!fresh) newArtistTracks.set(ref.slug, fresh = { ids: new Set(), count: 0 });
        fresh.count++;
        for (const id of ids(track)) fresh.ids.add(id);
      }
    }
  }
  for (const [slug, edit] of edits) artists.set(slug, {
    ...edit.artist,
    trackIds: [...edit.trackIds],
    trackCount: edit.count,
    categories: [...edit.categories],
    ...(edit.aliases.size ? { aliases: [...edit.aliases] } : {}),
  });
  if (artistTrackIds) {
    const mappingEdits = new Map<string, Set<string>>();
    for (const [slug, edit] of edits) {
      for (const alias of new Set([slug, ...edit.aliases].map(artistKey).filter(Boolean))) {
        let mapped = mappingEdits.get(alias);
        if (!mapped) mappingEdits.set(alias, mapped = new Set(artistTrackIds[alias] ?? []));
        for (const id of edit.trackIds) mapped.add(id);
      }
    }
    for (const [alias, mapped] of mappingEdits) artistTrackIds[alias] = [...mapped];
  }

  // Missing compact profiles do not establish that an archive artist is new.
  // Only count a demonstrably new profile; existing full profiles carry old IDs.
  let addedArtists = 0;
  for (const [slug, fresh] of newArtistTracks) {
    if (baseArtistSlugs.has(slug)) continue;
    const profile = profiles.get(slug);
    if (!compact || (profile && profile.trackIds.every(id => fresh.ids.has(id))
      && (profile.trackCount ?? profile.trackIds.length) <= fresh.count)) addedArtists++;
  }
  const selected = index.scope === "home" || index.scope === "landing"
    ? selectRecent([...releases.values()].map(release => release.track)) : null;
  const additions = [...releases.values()].filter(release => !release.before && (!selected || selected.has(release.track.id))).map(release => release.track);
  const result = {
    ...base,
    updatedAt: archiveOlder ? bundle.observedAt : base.updatedAt,
    tracks: [...tracks.slice(0, base.tracks.length), ...additions],
    artists: [...artists.values()],
    categories: [...categories],
    categoryCounts: Object.fromEntries(categoryCounts),
    ...(artistTrackIds ? { artistTrackIds } : {}),
    ...(index.archiveStats ? { archiveStats: {
      ...index.archiveStats,
      tracks: index.archiveStats.tracks + addedTracks,
      videos: index.archiveStats.videos + addedVideos,
      artists: index.archiveStats.artists + addedArtists,
    } } : {}),
  } as T;
  return remember(result);
}

function mergeTrack(original: MusicTrack, incoming: MusicTrack): MusicTrack {
  const idAliases = [...new Set([...(original.idAliases ?? []), ...ids(incoming)])].filter(id => id !== original.id);
  const moods = [...new Set([...(original.moods ?? []), ...(incoming.moods ?? []),
    ...(incoming.category && incoming.category !== original.category ? [incoming.category] : [])])];
  return {
    ...original,
    sources: mergeSources(original.sources, incoming.sources),
    ...(idAliases.length ? { idAliases } : {}),
    ...(moods.length ? { moods } : {}),
  };
}

function mergeSources(originals: MusicSource[], incoming: MusicSource[]): MusicSource[] {
  const sources = [...originals];
  const positions = new Map(sources.map((source, position) => [source.url, position]));
  const added: MusicSource[] = [];
  for (const source of incoming) {
    const time = checkedTime(source.checkedAt);
    if (!Number.isFinite(time) || typeof source.available !== "boolean") continue;
    const position = positions.get(source.url);
    if (position === undefined) {
      // Keep failed checks internally as tombstones against older successes;
      // only verified alternatives are admitted to the returned source list.
      positions.set(source.url, sources.length);
      sources.push({ ...source });
    } else {
      const original = sources[position];
      const previous = checkedTime(original.checkedAt);
      if (!Number.isFinite(previous) || time > previous) {
        // Preserve publisher labels, download-only flags and other originals.
        sources[position] = { ...original, available: source.available, checkedAt: source.checkedAt };
      }
    }
  }
  // A checked playable alternative must precede untouched unverified originals.
  for (let position = originals.length; position < sources.length; position++) if (verified(sources[position])) added.push(sources[position]);
  return [...added, ...sources.slice(0, originals.length)];
}

/** Provider-neutral: 48 recent releases, plus a small sample of each kind/tag. */
function selectRecent(tracks: MusicTrack[]): Set<string> {
  const time = (track: MusicTrack) => checkedTime(track.addedAt ?? track.publishedAt ?? track.detailCheckedAt) || 0;
  const sorted = [...tracks].sort((left, right) => time(right) - time(left) || left.id.localeCompare(right.id));
  const selected = new Set(sorted.slice(0, 48).map(track => track.id));
  const counts = new Map<string, number>();
  for (const track of sorted) {
    for (const tag of new Set([`kind:${track.kind}`, ...tags(track)])) {
      const count = counts.get(tag) ?? 0;
      counts.set(tag, count + 1);
      if (count < 8 && selected.size < 180) selected.add(track.id);
    }
  }
  return selected;
}

function artistKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064a\u0649]/g, "\u06cc").replace(/\u0643/g, "\u06a9")
    .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}
